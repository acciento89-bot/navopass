package de.kamilunavo.navopass

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

val NavoBlue = Color(0xFF087FB8)
val NavoBlueDeep = Color(0xFF054D7A)
val NavoIce = Color(0xFFE8F5FB)
val NavoDanger = Color(0xFFD84C5D)
val NavoSuccess = Color(0xFF15886A)

private val LightColors = lightColorScheme(
    primary = NavoBlue,
    onPrimary = Color.White,
    secondary = NavoBlueDeep,
    background = Color(0xFFF7FAFC),
    surface = Color.White,
    surfaceVariant = Color(0xFFEAF2F6),
    outline = Color(0xFFD7E2E8),
    error = NavoDanger
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF56B9E5),
    onPrimary = Color(0xFF002F43),
    secondary = Color(0xFF9DCCE2),
    background = Color(0xFF081218),
    surface = Color(0xFF101D24),
    surfaceVariant = Color(0xFF172831),
    outline = Color(0xFF2E424D),
    error = Color(0xFFFF8C99)
)

@Composable
fun NavoPassTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = if (isSystemInDarkTheme()) DarkColors else LightColors, content = content)
}

@Composable
fun NavoBackground(content: @Composable BoxScope.() -> Unit) {
    val scheme = MaterialTheme.colorScheme
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    listOf(
                        scheme.primary.copy(alpha = 0.12f),
                        scheme.background,
                        scheme.secondary.copy(alpha = 0.07f)
                    )
                )
            ),
        content = content
    )
}

@Composable
fun NavoCard(
    modifier: Modifier = Modifier,
    padding: PaddingValues = PaddingValues(18.dp),
    content: @Composable ColumnScope.() -> Unit
) {
    Column(
        modifier = modifier
            .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.96f), RoundedCornerShape(22.dp))
            .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.8f), RoundedCornerShape(22.dp))
            .padding(padding),
        content = content
    )
}

@Composable
fun PageHeader(eyebrow: String, title: String, subtitle: String, modifier: Modifier = Modifier) {
    Column(modifier) {
        Text(eyebrow.uppercase(), color = MaterialTheme.colorScheme.primary, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
        Text(title, color = MaterialTheme.colorScheme.onBackground, fontSize = 32.sp, lineHeight = 38.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 6.dp))
        Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 15.sp, lineHeight = 21.sp, modifier = Modifier.padding(top = 6.dp))
    }
}
