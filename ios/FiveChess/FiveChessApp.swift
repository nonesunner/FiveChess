import SwiftUI

@main
struct FiveChessApp: App {
    var body: some Scene {
        WindowGroup {
            ZStack {
                Color(red: 248 / 255, green: 250 / 255, blue: 252 / 255)
                    .ignoresSafeArea()
                WebView()
            }
            .preferredColorScheme(.light)
        }
    }
}
