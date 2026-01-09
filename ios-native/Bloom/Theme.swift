import SwiftUI

struct Theme {
    struct Colors {
        static let background = Color(hex: "1A1A1A")
        static let backgroundLight = Color(hex: "242424")
        static let surface = Color(hex: "2c2c2c")
        static let surfaceLight = Color(hex: "363636")
        
        static let sage = Color(hex: "FFB7C5") // Cherry Blossom Pink
        static let bloom = Color(hex: "FFB7C5")
        static let seed = Color(hex: "4a4a4a")
        
        static let cream = Color(hex: "F9F7F2")
        static let textPrimary = Color(hex: "f5f2e8")
        static let textSecondary = Color(hex: "a8a8a8")
        static let textMuted = Color(hex: "666666")
        
        static let gold = Color(hex: "d4a574")
    }
    
    struct Spacing {
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 20
        static let xl: CGFloat = 24
        static let xxl: CGFloat = 32
        static let xxxl: CGFloat = 40
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
