package com.zencan.bloom.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.WeekFields
import java.util.Locale

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "zen_store")

class ZenStore(private val context: Context) {
    
    private val json = Json { ignoreUnknownKeys = true }
    
    companion object {
        private val ONBOARDING_COMPLETED = booleanPreferencesKey("onboarding_completed")
        private val CURRENT_WEEK = stringPreferencesKey("current_week")
        private val WEEK_HISTORY = stringPreferencesKey("week_history")
    }
    
    // In-memory state
    private val _currentWeek = MutableStateFlow(createNewWeek())
    val currentWeek: StateFlow<WeekData> = _currentWeek.asStateFlow()
    
    private val _history = MutableStateFlow<List<WeekData>>(emptyList())
    val history: StateFlow<List<WeekData>> = _history.asStateFlow()
    
    private val _hasCompletedOnboarding = MutableStateFlow(false)
    val hasCompletedOnboarding: StateFlow<Boolean> = _hasCompletedOnboarding.asStateFlow()
    
    private val _isInitialized = MutableStateFlow(false)
    val isInitialized: StateFlow<Boolean> = _isInitialized.asStateFlow()
    
    suspend fun initialize() {
        // Load onboarding state
        context.dataStore.data.first().let { prefs ->
            _hasCompletedOnboarding.value = prefs[ONBOARDING_COMPLETED] ?: false
            
            // Load week data
            prefs[CURRENT_WEEK]?.let { weekJson ->
                try {
                    val loadedWeek = json.decodeFromString<WeekData>(weekJson)
                    _currentWeek.value = loadedWeek
                } catch (e: Exception) {
                    // If parsing fails, use default
                }
            }
            
            // Load history
            prefs[WEEK_HISTORY]?.let { historyJson ->
                try {
                    _history.value = json.decodeFromString<List<WeekData>>(historyJson)
                } catch (e: Exception) {
                    // Skip if fails
                }
            }
        }
        
        rotateWeekIfNecessary()
        
        // Deliberate delay to show splash screen
        kotlinx.coroutines.delay(1800)
        _isInitialized.value = true
    }
    
    suspend fun completeOnboarding() {
        _hasCompletedOnboarding.value = true
        context.dataStore.edit { prefs ->
            prefs[ONBOARDING_COMPLETED] = true
        }
    }
    
    suspend fun addClip(clip: DayClip) {
        val updatedClips = _currentWeek.value.clips.filter { it.dayIndex != clip.dayIndex } + clip
        _currentWeek.value = _currentWeek.value.copy(
            clips = updatedClips,
            isComplete = updatedClips.size >= 1 // At least one clip makes it eligible for generation
        )
        saveWeekData()
    }
    
    suspend fun rotateWeekIfNecessary() {
        val freshWeek = createNewWeek()
        if (freshWeek.weekId != _currentWeek.value.weekId) {
            // New week has started, archive current week if it has clips
            if (_currentWeek.value.clips.isNotEmpty()) {
                val updatedHistory = listOf(_currentWeek.value) + _history.value
                _history.value = updatedHistory.take(10) // Keep last 10 weeks
                saveHistory()
            }
            _currentWeek.value = freshWeek
            saveWeekData()
        }
    }
    
    suspend fun forceRotateWeek() {
        if (_currentWeek.value.clips.isNotEmpty()) {
            val updatedHistory = listOf(_currentWeek.value) + _history.value
            _history.value = updatedHistory.take(10)
            saveHistory()
        }
        _currentWeek.value = createNewWeek()
        saveWeekData()
    }

    suspend fun updateHistory(newHistory: List<WeekData>) {
        _history.value = newHistory
        saveHistory()
    }

    private suspend fun saveHistory() {
        context.dataStore.edit { prefs ->
            prefs[WEEK_HISTORY] = json.encodeToString(_history.value)
        }
    }
    
    suspend fun clearGeneratedVideo() {
        _currentWeek.value = _currentWeek.value.copy(generatedVideoUri = null)
        saveWeekData()
    }

    suspend fun setGeneratedVideoUri(uri: String?) {
        _currentWeek.value = _currentWeek.value.copy(generatedVideoUri = uri)
        saveWeekData()
    }

    suspend fun setGeneratedVideo(uri: String) {
        setGeneratedVideoUri(uri)
    }

    suspend fun setGeneratedVideoForWeek(weekId: String, uri: String) {
        if (weekId == _currentWeek.value.weekId) {
            setGeneratedVideoUri(uri)
        } else {
            val updatedHistory = _history.value.map {
                if (it.weekId == weekId) it.copy(generatedVideoUri = uri) else it
            }
            _history.value = updatedHistory
            saveHistory()
        }
    }
    
    private suspend fun saveWeekData() {
        context.dataStore.edit { prefs ->
            prefs[CURRENT_WEEK] = json.encodeToString(_currentWeek.value)
        }
    }
    
    fun getClip(dayIndex: Int): DayClip? {
        return _currentWeek.value.clips.find { it.dayIndex == dayIndex }
    }
    
    // Get today's day index (0=Mon, ... 6=Sun)
    val todayIndex: Int
        get() {
            val dayOfWeek = LocalDate.now().dayOfWeek.value // 1=Mon, 7=Sun
            return dayOfWeek - 1 // Convert to 0-indexed
        }
    
    fun isToday(dayIndex: Int): Boolean = dayIndex == todayIndex
    
    fun hasClipForToday(): Boolean {
        return getClip(todayIndex) != null
    }

    fun currentWeekRange(): String {
        val now = LocalDate.now()
        val weekFields = WeekFields.of(Locale.getDefault())
        val firstDayOfWeek = now.with(weekFields.dayOfWeek(), 1L)
        val lastDayOfWeek = now.with(weekFields.dayOfWeek(), 7L)
        
        val df = DateTimeFormatter.ofPattern("MMM d", Locale.getDefault())
        val dfDay = DateTimeFormatter.ofPattern("d", Locale.getDefault())
        
        return "${firstDayOfWeek.format(df)}-${lastDayOfWeek.format(dfDay)}"
    }

    private fun createNewWeek(): WeekData {
        val now = LocalDate.now()
        val weekFields = WeekFields.of(Locale.getDefault())
        val weekNumber = now.get(weekFields.weekOfYear())
        val year = now.year
        
        return WeekData(
            weekId = "$year-W${weekNumber.toString().padStart(2, '0')}",
            startDate = now.format(DateTimeFormatter.ISO_DATE),
            clips = emptyList(),
            isComplete = false,
            generatedVideoUri = null
        )
    }
}
