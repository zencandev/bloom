# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /sdk/tools/proguard/proguard-android.txt

# Keep serialization classes
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt

-keepclassmembers class kotlinx.serialization.json.** {
    *** Companion;
}
-keepclasseswithmembers class kotlinx.serialization.json.** {
    kotlinx.serialization.KSerializer serializer(...);
}

-keep,includedescriptorclasses class com.zencan.bloom.**$$serializer { *; }
-keepclassmembers class com.zencan.bloom.** {
    *** Companion;
}
-keepclasseswithmembers class com.zencan.bloom.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# FFmpegKit - although usually embedded, these protect the native interface
-keep class com.arthenica.ffmpegkit.** { *; }
-keep class com.arthenica.smartmetadataretriever.** { *; }
