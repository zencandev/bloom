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

-keep,includedescriptorclasses class com.zensnap.bloom.**$$serializer { *; }
-keepclassmembers class com.zensnap.bloom.** {
    *** Companion;
}
-keepclasseswithmembers class com.zensnap.bloom.** {
    kotlinx.serialization.KSerializer serializer(...);
}
