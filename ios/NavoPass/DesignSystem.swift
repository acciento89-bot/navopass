import SwiftUI

enum NavoTheme {
    static let accent = Color(red: 0.03, green: 0.50, blue: 0.72)
    static let accentDeep = Color(red: 0.02, green: 0.30, blue: 0.48)
    static let surface = Color(uiColor: .secondarySystemBackground)
    static let elevatedSurface = Color(uiColor: .tertiarySystemBackground)
    static let border = Color.primary.opacity(0.09)
}

struct NavoBackground: View {
    var body: some View {
        ZStack {
            Color(uiColor: .systemBackground)
            LinearGradient(
                colors: [NavoTheme.accent.opacity(0.13), .clear, NavoTheme.accentDeep.opacity(0.06)],
                startPoint: .topTrailing,
                endPoint: .bottomLeading
            )
        }
        .ignoresSafeArea()
    }
}

struct PageHeader: View {
    let eyebrow: LocalizedStringKey
    let title: LocalizedStringKey
    let subtitle: LocalizedStringKey

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(eyebrow)
                .font(.caption.weight(.bold))
                .textCase(.uppercase)
                .tracking(1.2)
                .foregroundStyle(NavoTheme.accent)
            Text(title)
                .font(.system(.largeTitle, design: .rounded, weight: .bold))
                .foregroundStyle(.primary)
            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }
}

struct FeatureIcon: View {
    let systemName: String
    var color: Color = NavoTheme.accent

    var body: some View {
        Image(systemName: systemName)
            .font(.system(size: 19, weight: .semibold))
            .foregroundStyle(color)
            .frame(width: 44, height: 44)
            .background(color.opacity(0.13), in: RoundedRectangle(cornerRadius: 13, style: .continuous))
    }
}

extension View {
    func navoCard(padding: CGFloat = 18) -> some View {
        self
            .padding(padding)
            .background(NavoTheme.surface, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .stroke(NavoTheme.border, lineWidth: 1)
            }
    }

    func navoPageMargins() -> some View {
        self.padding(.horizontal, 20)
    }
}
