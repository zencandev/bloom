package com.zensnap.bloom

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.zensnap.bloom.data.Route
import com.zensnap.bloom.data.ZenStore
import com.zensnap.bloom.notifications.NotificationScheduler
import com.zensnap.bloom.ui.screens.*
import com.zensnap.bloom.ui.theme.BloomColors
import com.zensnap.bloom.ui.theme.BloomTheme

class MainActivity : ComponentActivity() {
    
    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            NotificationScheduler.scheduleReminders(this)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        
        val context = this
        val zenStore = ZenStore(context)
        
        // Handle notification permission
        checkNotificationPermission()
        
        // Keep splash screen on until ZenStore is initialized
        splashScreen.setKeepOnScreenCondition {
            !zenStore.isInitialized.value
        }
        
        setContent {
            BloomTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = BloomColors.Background
                ) {
                    val navigateTo = intent.getStringExtra("navigate_to")
                    BloomNavigation(zenStore, navigateTo)
                }
            }
        }
    }

    private fun checkNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            when {
                ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED -> {
                    NotificationScheduler.scheduleReminders(this)
                }
                else -> {
                    requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                }
            }
        } else {
            NotificationScheduler.scheduleReminders(this)
        }
    }
}

@Composable
fun BloomNavigation(zenStore: ZenStore, navigateTo: String? = null) {
    val navController = rememberNavController()
    
    val hasCompletedOnboarding by zenStore.hasCompletedOnboarding.collectAsState()
    val isInitialized by zenStore.isInitialized.collectAsState()
    
    LaunchedEffect(Unit) {
        if (!isInitialized) {
            zenStore.initialize()
        }
    }
    
    // Handle deep-link navigation
    LaunchedEffect(isInitialized, navigateTo) {
        if (isInitialized && navigateTo == "history") {
            navController.navigate(Route.GeneratedVideo.route)
        }
    }
    
    // Only show navigation once initialized
    if (isInitialized) {
        val startDestination = if (hasCompletedOnboarding) Route.Home.route else Route.Onboarding.route
        
        NavHost(
            navController = navController,
            startDestination = startDestination
        ) {
        composable(Route.Onboarding.route) {
            OnboardingScreen(
                onComplete = {
                    navController.navigate(Route.Home.route) {
                        popUpTo(Route.Onboarding.route) { inclusive = true }
                    }
                },
                zenStore = zenStore
            )
        }
        
        composable(Route.Home.route) {
            HomeScreen(
                zenStore = zenStore,
                onNavigateToBreathe = { dayIndex ->
                    navController.navigate(Route.Breathe.createRoute(dayIndex))
                },
                onNavigateToPreview = { dayIndex ->
                    navController.navigate(Route.Preview.createRoute(dayIndex))
                },
                onNavigateToGeneratedVideo = {
                    navController.navigate(Route.GeneratedVideo.route)
                }
            )
        }
        
        composable(
            route = Route.Breathe.ROUTE,
            arguments = listOf(navArgument("dayIndex") { type = NavType.IntType })
        ) { backStackEntry ->
            val dayIndex = backStackEntry.arguments?.getInt("dayIndex") ?: 0
            BreatheScreen(
                dayIndex = dayIndex,
                onBack = { navController.popBackStack() },
                onComplete = {
                    navController.navigate(Route.Capture.createRoute(dayIndex)) {
                        popUpTo(Route.Home.route)
                    }
                }
            )
        }
        
        composable(
            route = Route.Capture.ROUTE,
            arguments = listOf(navArgument("dayIndex") { type = NavType.IntType })
        ) { backStackEntry ->
            val dayIndex = backStackEntry.arguments?.getInt("dayIndex") ?: 0
            CaptureScreen(
                dayIndex = dayIndex,
                zenStore = zenStore,
                onComplete = {
                    navController.navigate(Route.Home.route) {
                        popUpTo(Route.Home.route) { inclusive = true }
                    }
                }
            )
        }
        
        composable(
            route = Route.Preview.ROUTE,
            arguments = listOf(navArgument("dayIndex") { type = NavType.IntType })
        ) { backStackEntry ->
            val dayIndex = backStackEntry.arguments?.getInt("dayIndex") ?: 0
            PreviewScreen(
                dayIndex = dayIndex,
                zenStore = zenStore,
                onBack = { navController.popBackStack() }
            )
        }
        
        composable(Route.GeneratedVideo.route) {
            GeneratedVideoScreen(
                zenStore = zenStore,
                onBack = { navController.popBackStack() }
            )
        }
        }
    }
}
