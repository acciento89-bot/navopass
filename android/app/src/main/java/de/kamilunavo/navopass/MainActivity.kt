package de.kamilunavo.navopass

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Mail
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.OpenInBrowser
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Workspaces
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.util.Locale

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            NavoPassTheme {
                val initialPublicId = intent?.data?.takeIf { it.host == "navopass.de" }?.pathSegments
                    ?.takeIf { it.firstOrNull() == "p" }?.getOrNull(1)
                NavoPassApp(initialPublicId)
            }
        }
    }
}

private enum class MainTab(val icon: ImageVector) {
    Passes(Icons.Default.Inventory2), Service(Icons.Default.Build), Scan(Icons.Default.QrCode2),
    Alerts(Icons.Default.Notifications), More(Icons.Default.MoreHoriz)
}

private val isGerman get() = Locale.getDefault().language == "de"
private fun tr(de: String, en: String) = if (isGerman) de else en

@Composable
private fun NavoPassApp(initialPublicId: String?) {
    val model: NavoViewModel = viewModel()
    val state by model.state.collectAsState()
    var route by remember { mutableStateOf<AppRoute>(AppRoute.Main) }
    var publicId by remember { mutableStateOf(initialPublicId) }

    NavoBackground {
        when {
            state.restoring -> LoadingScreen(tr("NavoPass wird geladen …", "Loading NavoPass…"))
            state.user == null -> LoginScreen(state, model)
            publicId != null -> PublicPassScreen(publicId!!, model.api) { publicId = null }
            route == AppRoute.Main -> MainTabs(state, model, onRoute = { route = it }, onPublicId = { publicId = it })
            route is AppRoute.AssetDetail -> AssetDetailScreen((route as AppRoute.AssetDetail).id, model, onBack = { route = AppRoute.Main })
            route == AppRoute.NewAsset -> NewAssetScreen(model, onBack = { route = AppRoute.Main })
            route == AppRoute.Account -> AccountScreen(state, model, onBack = { route = AppRoute.Main }, onDelete = { route = AppRoute.DeleteAccount })
            route == AppRoute.DeleteAccount -> DeleteAccountScreen(state, model, onBack = { route = AppRoute.Account })
        }
    }
}

@Composable
private fun LoadingScreen(label: String) {
    Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        CircularProgressIndicator()
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 16.dp))
    }
}

@Composable
private fun LoginScreen(state: NavoState, model: NavoViewModel) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    val context = LocalContext.current
    Column(
        Modifier.fillMaxSize().statusBarsPadding().verticalScroll(rememberScrollState()).padding(horizontal = 24.dp, vertical = 34.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(14.dp))
        Box(
            Modifier.size(88.dp).background(
                androidx.compose.ui.graphics.Brush.linearGradient(listOf(NavoBlue, NavoBlueDeep)),
                RoundedCornerShape(27.dp)
            ), contentAlignment = Alignment.Center
        ) { Icon(Icons.Default.Shield, null, tint = Color.White, modifier = Modifier.size(48.dp)) }
        Text("NavoPass", fontSize = 34.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 18.dp))
        Text(
            tr("Deine digitalen Pässe. Sicher verfügbar, wo du sie brauchst.", "Your digital passes. Securely available wherever you need them."),
            color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            lineHeight = 22.sp, modifier = Modifier.padding(top = 8.dp, bottom = 24.dp)
        )
        NavoCard(Modifier.fillMaxWidth()) {
            OutlinedTextField(
                value = email, onValueChange = { email = it }, modifier = Modifier.fillMaxWidth(),
                label = { Text(tr("E-Mail-Adresse", "Email address")) }, leadingIcon = { Icon(Icons.Default.Mail, null) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next), singleLine = true
            )
            OutlinedTextField(
                value = password, onValueChange = { password = it }, modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
                label = { Text(tr("Passwort", "Password")) }, leadingIcon = { Icon(Icons.Default.Lock, null) },
                visualTransformation = PasswordVisualTransformation(), singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { if (email.isNotBlank() && password.isNotBlank()) model.signIn(email, password) })
            )
        }
        state.error?.let { ErrorCard(it, Modifier.padding(top = 14.dp)) }
        Button(
            onClick = { model.signIn(email, password) }, enabled = email.isNotBlank() && password.isNotBlank() && !state.loading,
            modifier = Modifier.fillMaxWidth().height(56.dp).padding(top = 14.dp), shape = RoundedCornerShape(17.dp)
        ) { if (state.loading) CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp) else Text(tr("Anmelden", "Sign in"), fontWeight = FontWeight.Bold) }
        TextButton(onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://navopass.de/register"))) }) {
            Text(tr("Konto auf navopass.de erstellen", "Create an account on navopass.de"), fontWeight = FontWeight.SemiBold)
        }
        Text("Kamilunavo · Privacy by design", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 12.dp))
    }
}

@Composable
private fun MainTabs(state: NavoState, model: NavoViewModel, onRoute: (AppRoute) -> Unit, onPublicId: (String) -> Unit) {
    var tab by remember { mutableStateOf(MainTab.Passes) }
    Scaffold(
        containerColor = Color.Transparent,
        bottomBar = {
            NavigationBar(Modifier.navigationBarsPadding(), containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.97f)) {
                MainTab.entries.forEach { item ->
                    NavigationBarItem(
                        selected = tab == item, onClick = { tab = item }, icon = { Icon(item.icon, null) },
                        label = { Text(when (item) {
                            MainTab.Passes -> tr("Pässe", "Passes"); MainTab.Service -> tr("Service", "Service")
                            MainTab.Scan -> tr("Scan", "Scan"); MainTab.Alerts -> tr("Hinweise", "Alerts"); MainTab.More -> tr("Mehr", "More")
                        }, fontSize = 11.sp) }, colors = NavigationBarItemDefaults.colors(indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f))
                    )
                }
            }
        }
    ) { padding ->
        Box(Modifier.padding(padding)) {
            when (tab) {
                MainTab.Passes -> PassesScreen(state, model, { onRoute(AppRoute.AssetDetail(it)) }, { onRoute(AppRoute.NewAsset) })
                MainTab.Service -> ServiceScreen(state)
                MainTab.Scan -> ScannerScreen(onPublicId)
                MainTab.Alerts -> AlertsScreen(state)
                MainTab.More -> MoreScreen(state, onRoute)
            }
        }
    }
}

@Composable
private fun PassesScreen(state: NavoState, model: NavoViewModel, openAsset: (String) -> Unit, newAsset: () -> Unit) {
    var search by remember { mutableStateOf("") }
    val visible = state.assets.filter { it.archivedAt == null && (search.isBlank() || listOf(it.name, it.category, it.manufacturer, it.model).any { value -> value?.contains(search, true) == true }) }
    LazyColumn(Modifier.fillMaxSize().statusBarsPadding(), contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp, 18.dp, 20.dp, 34.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item {
            Row(verticalAlignment = Alignment.Top) {
                PageHeader(tr("Digitales Objekt-Wallet", "Digital asset wallet"), tr("Meine Pässe", "My passes"), tr("Alles Wichtige für deine Objekte an einem sicheren Ort.", "Everything important for your assets in one secure place."), Modifier.weight(1f))
                IconButton(onClick = { model.refreshAll() }) { Icon(Icons.Default.Refresh, tr("Aktualisieren", "Refresh")) }
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                SummaryTile(state.assets.count { it.archivedAt == null }, tr("Aktiv", "Active"), Modifier.weight(1f))
                SummaryTile(state.assets.count { it.favorite && it.archivedAt == null }, tr("Favoriten", "Favourites"), Modifier.weight(1f))
                SummaryTile(state.assets.count { it.visibility != "PRIVATE" && it.archivedAt == null }, tr("Geteilt", "Shared"), Modifier.weight(1f))
            }
        }
        item {
            OutlinedTextField(search, { search = it }, Modifier.fillMaxWidth(), placeholder = { Text(tr("Pässe durchsuchen", "Search passes")) }, leadingIcon = { Icon(Icons.Default.Search, null) }, singleLine = true)
        }
        state.error?.let { item { ErrorCard(it) } }
        if (visible.isEmpty()) item {
            NavoCard(Modifier.fillMaxWidth()) {
                Icon(Icons.Default.Inventory2, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(42.dp))
                Text(tr("Noch keine Pässe", "No passes yet"), fontSize = 20.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 12.dp))
                Text(tr("Erstelle deinen ersten digitalen Objektpass.", "Create your first digital asset pass."), color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 5.dp))
            }
        }
        items(visible, key = { it.id }) { asset -> AssetCard(asset, openAsset) }
        item {
            Button(newAsset, Modifier.fillMaxWidth().height(54.dp), shape = RoundedCornerShape(17.dp)) {
                Icon(Icons.Default.Add, null); Spacer(Modifier.width(8.dp)); Text(tr("Neuer Pass", "New pass"), fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun AssetCard(asset: Asset, open: (String) -> Unit) {
    NavoCard(Modifier.fillMaxWidth().clickable { open(asset.id) }) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            FeatureIcon(if (asset.favorite) Icons.Default.Favorite else Icons.Default.Inventory2)
            Column(Modifier.weight(1f).padding(horizontal = 14.dp)) {
                Text(asset.name, fontSize = 18.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(listOfNotNull(asset.manufacturer, asset.model).joinToString(" · ").ifBlank { asset.category }, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp, maxLines = 1)
            }
            Icon(Icons.Default.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Row(Modifier.fillMaxWidth().padding(top = 15.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            MetaPill(Icons.Default.CalendarMonth, asset.nextServiceDate ?: tr("Nicht geplant", "Not planned"), Modifier.weight(1f))
            MetaPill(Icons.Default.Security, asset.visibility.lowercase().replaceFirstChar { it.uppercase() }, Modifier.weight(1f))
        }
        asset.location?.let { Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, modifier = Modifier.padding(top = 10.dp)) }
    }
}

@Composable
private fun ServiceScreen(state: NavoState) {
    val planned = state.assets.filter { it.archivedAt == null && it.nextServiceDate != null }.sortedBy { it.nextServiceDate }
    val overdue = planned.count { daysUntil(it.nextServiceDate) < 0 }
    val soon = planned.count { daysUntil(it.nextServiceDate) in 0..30 }
    LazyColumn(Modifier.fillMaxSize().statusBarsPadding(), contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp, 18.dp, 20.dp, 36.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { PageHeader(tr("Service & Fristen", "Service & deadlines"), tr("Wartungszentrale", "Maintenance center"), tr("Plane Wartungen und behalte Garantiefristen im Blick.", "Plan maintenance and keep warranty dates under control.")) }
        item { Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SummaryTile(overdue, tr("Überfällig", "Overdue"), Modifier.weight(1f), overdue > 0)
            SummaryTile(soon, tr("Nächste 30 Tage", "Next 30 days"), Modifier.weight(1f))
            SummaryTile(state.assets.count { it.archivedAt == null && it.nextServiceDate == null }, tr("Nicht geplant", "Not planned"), Modifier.weight(1f))
        } }
        if (planned.isEmpty()) item { EmptyCard(Icons.Default.Build, tr("Keine Wartung geplant", "No maintenance planned"), tr("Hinterlege einen Servicetermin in einem Pass.", "Add a service date to a pass.")) }
        items(planned, key = { it.id }) { asset ->
            NavoCard(Modifier.fillMaxWidth()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    FeatureIcon(Icons.Default.Build)
                    Column(Modifier.padding(start = 14.dp).weight(1f)) {
                        Text(asset.name, fontWeight = FontWeight.Bold, fontSize = 17.sp)
                        Text(asset.nextServiceDate.orEmpty(), color = if (daysUntil(asset.nextServiceDate) < 0) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    StatusPill(dueLabel(asset.nextServiceDate), daysUntil(asset.nextServiceDate) < 0)
                }
            }
        }
    }
}

@Composable
private fun AlertsScreen(state: NavoState) {
    val window = state.user?.reminderDays ?: 30
    val alerts = state.assets.flatMap { asset ->
        listOfNotNull(
            asset.nextServiceDate?.takeIf { daysUntil(it) <= window }?.let { Triple(asset, tr("Wartung", "Maintenance"), it) },
            asset.warrantyUntil?.takeIf { daysUntil(it) <= window }?.let { Triple(asset, tr("Garantie", "Warranty"), it) }
        )
    }.sortedBy { it.third }
    LazyColumn(Modifier.fillMaxSize().statusBarsPadding(), contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp, 18.dp, 20.dp, 36.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { PageHeader("NavoPass", tr("NavoPass erinnert dich", "NavoPass reminds you"), tr("Wartungen, Garantiefristen und Einladungen an einem Ort.", "Maintenance, warranty deadlines and invitations in one place.")) }
        item { Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SummaryTile(alerts.size, tr("Im Zeitraum", "In reminder window"), Modifier.weight(1f), alerts.any { daysUntil(it.third) < 0 })
            SummaryTile(state.overview?.invites?.size ?: 0, tr("Einladungen", "Invitations"), Modifier.weight(1f))
        } }
        if (alerts.isEmpty()) item { EmptyCard(Icons.Default.CheckCircle, tr("Alles im grünen Bereich", "Everything is on track"), tr("Keine Frist liegt in deinem Erinnerungszeitraum.", "No deadline falls within your reminder window.")) }
        items(alerts, key = { "${it.first.id}-${it.second}" }) { alert ->
            NavoCard(Modifier.fillMaxWidth()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    FeatureIcon(if (alert.second == "Warranty" || alert.second == "Garantie") Icons.Default.Security else Icons.Default.Build)
                    Column(Modifier.weight(1f).padding(start = 14.dp)) { Text(alert.second, fontSize = 12.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold); Text(alert.first.name, fontWeight = FontWeight.Bold); Text(alert.third, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    StatusPill(dueLabel(alert.third), daysUntil(alert.third) < 0)
                }
            }
        }
    }
}

@Composable
private fun ScannerScreen(onPublicId: (String) -> Unit) {
    val context = LocalContext.current
    var error by remember { mutableStateOf<String?>(null) }
    val options = remember { GmsBarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).enableAutoZoom().build() }
    val scanner = remember { GmsBarcodeScanning.getClient(context, options) }
    Column(Modifier.fillMaxSize().statusBarsPadding().padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        PageHeader(tr("Vor Ort", "On site"), tr("QR-Code scannen", "Scan QR code"), tr("Öffne einen NavoPass direkt am Objekt.", "Open a NavoPass directly at the asset."), Modifier.fillMaxWidth())
        Spacer(Modifier.weight(1f))
        Box(Modifier.size(210.dp).background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f), RoundedCornerShape(38.dp)), contentAlignment = Alignment.Center) {
            Icon(Icons.Default.QrCode2, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(112.dp))
        }
        Text(tr("Richte die Kamera auf einen NavoPass-QR-Code.", "Point the camera at a NavoPass QR code."), textAlign = androidx.compose.ui.text.style.TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(28.dp))
        error?.let { ErrorCard(it, Modifier.padding(bottom = 12.dp)) }
        Button(onClick = {
            error = null
            scanner.startScan().addOnSuccessListener { barcode ->
                val id = barcode.rawValue?.let(::extractPublicId)
                if (id != null) onPublicId(id) else error = tr("Dieser QR-Code gehört nicht zu NavoPass.", "This is not a NavoPass QR code.")
            }.addOnFailureListener { error = tr("Der Scanner konnte nicht gestartet werden.", "The scanner could not be started.") }
        }, Modifier.fillMaxWidth().height(56.dp), shape = RoundedCornerShape(17.dp)) { Icon(Icons.Default.QrCode2, null); Spacer(Modifier.width(9.dp)); Text(tr("Scan starten", "Start scan"), fontWeight = FontWeight.Bold) }
        Spacer(Modifier.weight(1f))
    }
}

@Composable
private fun MoreScreen(state: NavoState, onRoute: (AppRoute) -> Unit) {
    val context = LocalContext.current
    LazyColumn(Modifier.fillMaxSize().statusBarsPadding(), contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp, 18.dp, 20.dp, 36.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { PageHeader("NavoPass", tr("Mehr", "More"), tr("Alle nativen Werkzeuge für Objekte, Service und Konto.", "All native tools for your assets, service work and account.")) }
        item { NavoCard(Modifier.fillMaxWidth(), androidx.compose.foundation.layout.PaddingValues(8.dp)) {
            MenuRow(Icons.Default.Build, tr("Serviceeinsätze", "Service jobs"), tr("Einsätze planen und abschließen", "Plan and complete work orders")) { openUrl(context, "https://navopass.de/app/auftraege") }
            HorizontalDivider(Modifier.padding(start = 58.dp))
            MenuRow(Icons.Default.Workspaces, tr("Kunden & Bereiche", "Customers & workspaces"), tr("Kontakte und gemeinsame Bereiche", "Contacts and shared areas")) { openUrl(context, "https://navopass.de/app/kunden") }
            HorizontalDivider(Modifier.padding(start = 58.dp))
            MenuRow(Icons.Default.QrCode2, tr("QR-Etiketten", "QR labels"), tr("Pass-Codes anzeigen und teilen", "Show and share pass codes")) { openUrl(context, "https://navopass.de/app/sticker") }
        } }
        item { NavoCard(Modifier.fillMaxWidth(), androidx.compose.foundation.layout.PaddingValues(8.dp)) {
            MenuRow(Icons.Default.AccountCircle, tr("Profil & Konto", "Profile & account"), state.user?.email.orEmpty()) { onRoute(AppRoute.Account) }
            HorizontalDivider(Modifier.padding(start = 58.dp))
            MenuRow(Icons.Default.OpenInBrowser, tr("Tarife & Preise", "Plans & pricing"), tr("NavoPass-Tarife verwalten", "Manage NavoPass plans")) { openUrl(context, "https://navopass.de/preise") }
        } }
    }
}

@Composable
private fun AssetDetailScreen(id: String, model: NavoViewModel, onBack: () -> Unit) {
    var details by remember { mutableStateOf<AssetDetails?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var confirmDelete by remember { mutableStateOf(false) }
    val context = LocalContext.current
    LaunchedEffect(id) { try { details = withContext(Dispatchers.IO) { model.api.asset(id) } } catch (e: Exception) { error = e.message } }
    ScreenWithTopBar(tr("Passdetails", "Pass details"), onBack) { padding ->
        when {
            details == null && error == null -> LoadingScreen(tr("Pass wird geladen …", "Loading pass…"))
            error != null -> Column(Modifier.padding(padding).padding(20.dp)) { ErrorCard(error!!); OutlinedButton(onBack, Modifier.fillMaxWidth().padding(top = 12.dp)) { Text(tr("Zurück", "Back")) } }
            else -> {
                val value = details!!
                LazyColumn(Modifier.padding(padding), contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp, 18.dp, 20.dp, 38.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    item { PageHeader(value.asset.category, value.asset.name, listOfNotNull(value.asset.manufacturer, value.asset.model).joinToString(" · ").ifBlank { tr("Digitaler Objektpass", "Digital asset pass") }) }
                    item { NavoCard(Modifier.fillMaxWidth()) {
                        DetailRow(tr("Seriennummer", "Serial number"), value.asset.serialNumber ?: "—")
                        DetailRow(tr("Standort", "Location"), value.asset.location ?: "—")
                        DetailRow(tr("Garantie bis", "Warranty until"), value.asset.warrantyUntil ?: "—")
                        DetailRow(tr("Nächster Service", "Next service"), value.asset.nextServiceDate ?: tr("Nicht geplant", "Not planned"))
                    } }
                    item { Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        FilledTonalButton(onClick = { model.assetAction("toggleFavorite", id) { details = details?.copy(asset = details!!.asset.copy(favorite = !details!!.asset.favorite)) } }, Modifier.weight(1f)) { Icon(if (value.asset.favorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder, null); Spacer(Modifier.width(6.dp)); Text(tr("Favorit", "Favourite")) }
                        FilledTonalButton(onClick = { context.startActivity(Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, "https://navopass.de/p/${value.asset.publicId}") }) }, Modifier.weight(1f)) { Icon(Icons.Default.Share, null); Spacer(Modifier.width(6.dp)); Text(tr("Teilen", "Share")) }
                    } }
                    item { SectionTitle(tr("Historie", "History"), value.events.size) }
                    if (value.events.isEmpty()) item { EmptyCard(Icons.Default.Description, tr("Noch keine Einträge", "No entries yet"), tr("Service- und Reparatureinträge erscheinen hier.", "Service and repair entries appear here.")) }
                    items(value.events, key = { it.id }) { event -> NavoCard(Modifier.fillMaxWidth()) { Text(event.title, fontWeight = FontWeight.Bold); Text("${event.eventDate} · ${event.eventType}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp); event.description?.let { Text(it, modifier = Modifier.padding(top = 8.dp)) } } }
                    item { SectionTitle(tr("Dokumente", "Documents"), value.documents.size) }
                    items(value.documents, key = { it.id }) { document -> NavoCard(Modifier.fillMaxWidth().clickable { openUrl(context, document.url) }) { Row(verticalAlignment = Alignment.CenterVertically) { FeatureIcon(Icons.Default.Description); Column(Modifier.weight(1f).padding(start = 14.dp)) { Text(document.title, fontWeight = FontWeight.Bold); Text(document.kind, color = MaterialTheme.colorScheme.onSurfaceVariant) }; Icon(Icons.Default.OpenInBrowser, null) } } }
                    item { SectionTitle(tr("Passverwaltung", "Pass management"), null) }
                    item { NavoCard(Modifier.fillMaxWidth()) {
                        OutlinedButton(onClick = { model.assetAction("duplicateAsset", id) }, Modifier.fillMaxWidth()) { Icon(Icons.Default.Add, null); Spacer(Modifier.width(7.dp)); Text(tr("Pass duplizieren", "Duplicate pass")) }
                        OutlinedButton(onClick = { model.assetAction("toggleArchive", id) { onBack() } }, Modifier.fillMaxWidth().padding(top = 8.dp)) { Icon(Icons.Default.Archive, null); Spacer(Modifier.width(7.dp)); Text(tr("Pass archivieren", "Archive pass")) }
                        OutlinedButton(onClick = { confirmDelete = true }, Modifier.fillMaxWidth().padding(top = 8.dp), colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)) { Icon(Icons.Default.Delete, null); Spacer(Modifier.width(7.dp)); Text(tr("Pass löschen", "Delete pass")) }
                    } }
                }
            }
        }
    }
    if (confirmDelete) AlertDialog(onDismissRequest = { confirmDelete = false }, title = { Text(tr("Pass löschen?", "Delete pass?")) }, text = { Text(tr("Der Pass und seine Einträge werden dauerhaft gelöscht.", "The pass and its entries will be permanently deleted.")) }, confirmButton = { TextButton(onClick = { confirmDelete = false; model.assetAction("deleteAsset", id) { onBack() } }) { Text(tr("Löschen", "Delete"), color = MaterialTheme.colorScheme.error) } }, dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text(tr("Abbrechen", "Cancel")) } })
}

@Composable
private fun NewAssetScreen(model: NavoViewModel, onBack: () -> Unit) {
    var name by remember { mutableStateOf("") }; var category by remember { mutableStateOf("") }; var manufacturer by remember { mutableStateOf("") }
    var assetModel by remember { mutableStateOf("") }; var serial by remember { mutableStateOf("") }; var location by remember { mutableStateOf("") }
    var warranty by remember { mutableStateOf("") }; var service by remember { mutableStateOf("") }; var notes by remember { mutableStateOf("") }
    ScreenWithTopBar(tr("Neuer Pass", "New pass"), onBack) { padding ->
        Column(Modifier.padding(padding).verticalScroll(rememberScrollState()).padding(20.dp)) {
            PageHeader(tr("Digitaler Objektpass", "Digital asset pass"), tr("Neuen Pass anlegen", "Create new pass"), tr("Erfasse die wichtigsten Daten. Details kannst du später ergänzen.", "Capture the key details. You can add more later."))
            NavoCard(Modifier.fillMaxWidth().padding(top = 20.dp)) {
                FormField(name, { name = it }, tr("Name", "Name"), true)
                FormField(category, { category = it }, tr("Kategorie", "Category"))
                FormField(manufacturer, { manufacturer = it }, tr("Hersteller", "Manufacturer"))
                FormField(assetModel, { assetModel = it }, tr("Modell", "Model"))
                FormField(serial, { serial = it }, tr("Seriennummer", "Serial number"))
                FormField(location, { location = it }, tr("Standort", "Location"))
                FormField(warranty, { warranty = it }, tr("Garantieende (JJJJ-MM-TT)", "Warranty end (YYYY-MM-DD)"))
                FormField(service, { service = it }, tr("Nächster Service (JJJJ-MM-TT)", "Next service (YYYY-MM-DD)"))
                FormField(notes, { notes = it }, tr("Notizen", "Notes"))
            }
            Button(onClick = { model.createAsset(AssetDraft(name, category.ifBlank { "Other" }, manufacturer, assetModel, serialNumber = serial, warrantyUntil = warranty, nextServiceDate = service, location = location, notes = notes)) { if (it != null) onBack() } }, enabled = name.isNotBlank(), modifier = Modifier.fillMaxWidth().height(70.dp).padding(top = 16.dp), shape = RoundedCornerShape(17.dp)) { Text(tr("Pass erstellen", "Create pass"), fontWeight = FontWeight.Bold) }
        }
    }
}

@Composable
private fun AccountScreen(state: NavoState, model: NavoViewModel, onBack: () -> Unit, onDelete: () -> Unit) {
    val context = LocalContext.current
    ScreenWithTopBar(tr("Konto", "Account"), onBack) { padding ->
        Column(Modifier.padding(padding).verticalScroll(rememberScrollState()).padding(20.dp)) {
            PageHeader("NavoPass", tr("Dein Konto", "Your account"), tr("Profil, Tarif und rechtliche Informationen.", "Profile, plan and legal information."))
            state.user?.let { user -> NavoCard(Modifier.fillMaxWidth().padding(top = 20.dp)) { DetailRow(tr("Name", "Name"), user.name); DetailRow(tr("E-Mail", "Email"), user.email); DetailRow(tr("Tarif", "Plan"), user.plan) } }
            NavoCard(Modifier.fillMaxWidth().padding(top = 14.dp), androidx.compose.foundation.layout.PaddingValues(8.dp)) {
                MenuRow(Icons.Default.Security, tr("Datenschutz", "Privacy policy"), "navopass.de/datenschutz") { openUrl(context, "https://navopass.de/datenschutz") }
                HorizontalDivider(Modifier.padding(start = 58.dp))
                MenuRow(Icons.Default.Description, tr("Nutzungsbedingungen", "Terms of use"), "navopass.de/nutzungsbedingungen") { openUrl(context, "https://navopass.de/nutzungsbedingungen") }
            }
            OutlinedButton(onClick = { model.signOut() }, Modifier.fillMaxWidth().height(68.dp).padding(top = 14.dp), colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)) { Text(tr("Abmelden", "Sign out"), fontWeight = FontWeight.Bold) }
            NavoCard(Modifier.fillMaxWidth().padding(top = 14.dp)) { Text(tr("Gefahrenzone", "Danger zone"), color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold); Text(tr("Lösche dein NavoPass-Konto und alle zugehörigen Daten dauerhaft.", "Permanently delete your NavoPass account and associated data."), color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 8.dp)); OutlinedButton(onDelete, Modifier.fillMaxWidth(), colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)) { Icon(Icons.Default.Delete, null); Spacer(Modifier.width(7.dp)); Text(tr("Konto löschen", "Delete account")) } }
        }
    }
}

@Composable
private fun DeleteAccountScreen(state: NavoState, model: NavoViewModel, onBack: () -> Unit) {
    var password by remember { mutableStateOf("") }; var confirmation by remember { mutableStateOf("") }; var confirm by remember { mutableStateOf(false) }
    val valid = confirmation.trim().uppercase() in setOf("DELETE", "LÖSCHEN", "LOESCHEN")
    ScreenWithTopBar(tr("Konto löschen", "Delete account"), onBack) { padding ->
        Column(Modifier.padding(padding).verticalScroll(rememberScrollState()).padding(20.dp)) {
            PageHeader(tr("Kontosicherheit", "Account security"), tr("Konto löschen", "Delete account"), tr("Hiermit werden dein Konto und deine persönlichen NavoPass-Daten dauerhaft entfernt.", "This permanently removes your account and personal NavoPass data."))
            NavoCard(Modifier.fillMaxWidth().padding(top = 20.dp)) { Icon(Icons.Default.Security, null, tint = MaterialTheme.colorScheme.error); Text(tr("Aktive Abonnements werden zuerst gekündigt. Gemeinsame Bereiche müssen vorher übertragen oder gelöscht werden.", "Active subscriptions are cancelled first. Shared workspaces must be transferred or deleted beforehand."), modifier = Modifier.padding(top = 10.dp), color = MaterialTheme.colorScheme.onSurfaceVariant) }
            NavoCard(Modifier.fillMaxWidth().padding(top = 14.dp)) {
                OutlinedTextField(password, { password = it }, Modifier.fillMaxWidth(), label = { Text(tr("Aktuelles Passwort", "Current password")) }, visualTransformation = PasswordVisualTransformation(), singleLine = true)
                OutlinedTextField(confirmation, { confirmation = it }, Modifier.fillMaxWidth().padding(top = 12.dp), label = { Text(tr("LÖSCHEN eingeben", "Type DELETE to confirm")) }, singleLine = true)
            }
            state.error?.let { ErrorCard(it, Modifier.padding(top = 12.dp)) }
            Button(onClick = { confirm = true }, enabled = password.isNotBlank() && valid && !state.loading, modifier = Modifier.fillMaxWidth().height(70.dp).padding(top = 16.dp), colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error), shape = RoundedCornerShape(17.dp)) { Text(tr("Konto dauerhaft löschen", "Delete account permanently"), fontWeight = FontWeight.Bold) }
        }
    }
    if (confirm) AlertDialog(onDismissRequest = { confirm = false }, title = { Text(tr("Konto dauerhaft löschen?", "Delete account permanently?")) }, text = { Text(tr("Dies kann nicht rückgängig gemacht werden.", "This cannot be undone.")) }, confirmButton = { TextButton(onClick = { confirm = false; model.deleteAccount(password, confirmation) {} }) { Text(tr("Löschen", "Delete"), color = MaterialTheme.colorScheme.error) } }, dismissButton = { TextButton(onClick = { confirm = false }) { Text(tr("Abbrechen", "Cancel")) } })
}

@Composable
private fun PublicPassScreen(publicId: String, api: ApiClient, close: () -> Unit) {
    var details by remember { mutableStateOf<AssetDetails?>(null) }; var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(publicId) { try { details = withContext(Dispatchers.IO) { api.publicAsset(publicId) } } catch (e: Exception) { error = e.message } }
    ScreenWithTopBar(tr("Geteilter Pass", "Shared pass"), close) { padding ->
        when { details == null && error == null -> LoadingScreen(tr("Pass wird geladen …", "Loading pass…")); error != null -> Column(Modifier.padding(padding).padding(20.dp)) { ErrorCard(error!!) }; else -> LazyColumn(Modifier.padding(padding), contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            item { PageHeader(details!!.asset.category, details!!.asset.name, listOfNotNull(details!!.asset.manufacturer, details!!.asset.model).joinToString(" · ")) }
            item { NavoCard(Modifier.fillMaxWidth()) { DetailRow(tr("Standort", "Location"), details!!.asset.location ?: "—"); DetailRow(tr("Nächster Service", "Next service"), details!!.asset.nextServiceDate ?: "—") } }
            item { SectionTitle(tr("Geteilte Historie", "Shared history"), details!!.events.size) }
            items(details!!.events, key = { it.id }) { Text(it.title, modifier = Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surface, RoundedCornerShape(16.dp)).padding(16.dp), fontWeight = FontWeight.SemiBold) }
        } }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ScreenWithTopBar(title: String, back: () -> Unit, content: @Composable (androidx.compose.foundation.layout.PaddingValues) -> Unit) {
    Scaffold(containerColor = Color.Transparent, topBar = { TopAppBar(title = { Text(title, fontWeight = FontWeight.Bold) }, navigationIcon = { TextButton(back) { Text("‹", fontSize = 32.sp) } }, colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background.copy(alpha = 0.96f))) }, content = content)
}

@Composable private fun SummaryTile(value: Int, label: String, modifier: Modifier = Modifier, danger: Boolean = false) = NavoCard(modifier, androidx.compose.foundation.layout.PaddingValues(13.dp)) { Text(value.toString(), fontSize = 25.sp, fontWeight = FontWeight.Bold, color = if (danger && value > 0) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface); Text(label, fontSize = 11.sp, lineHeight = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
@Composable private fun FeatureIcon(icon: ImageVector) = Box(Modifier.size(44.dp).background(MaterialTheme.colorScheme.primary.copy(alpha = 0.13f), RoundedCornerShape(13.dp)), contentAlignment = Alignment.Center) { Icon(icon, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(22.dp)) }
@Composable private fun MetaPill(icon: ImageVector, text: String, modifier: Modifier = Modifier) = Row(modifier.background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(12.dp)).padding(10.dp), verticalAlignment = Alignment.CenterVertically) { Icon(icon, null, Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary); Text(text, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(start = 6.dp)) }
@Composable private fun StatusPill(text: String, danger: Boolean) = Text(text, color = if (danger) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary, fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.background((if (danger) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary).copy(alpha = 0.1f), RoundedCornerShape(50)).padding(horizontal = 9.dp, vertical = 6.dp))
@Composable private fun EmptyCard(icon: ImageVector, title: String, text: String) = NavoCard(Modifier.fillMaxWidth()) { Icon(icon, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(38.dp)); Text(title, fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 10.dp)); Text(text, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 5.dp)) }
@Composable private fun ErrorCard(text: String, modifier: Modifier = Modifier) = Text(text, color = MaterialTheme.colorScheme.error, modifier = modifier.fillMaxWidth().background(MaterialTheme.colorScheme.error.copy(alpha = 0.1f), RoundedCornerShape(15.dp)).padding(14.dp))
@Composable private fun SectionTitle(title: String, count: Int?) = Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) { Text(title, fontSize = 21.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f)); count?.let { Text(it.toString(), color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold) } }
@Composable private fun DetailRow(label: String, value: String) { Text(label.uppercase(), fontSize = 10.sp, letterSpacing = 0.8.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 7.dp)); Text(value, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 2.dp, bottom = 7.dp)) }
@Composable private fun FormField(value: String, change: (String) -> Unit, label: String, required: Boolean = false) = OutlinedTextField(value, change, Modifier.fillMaxWidth().padding(bottom = 11.dp), label = { Text(label + if (required) " *" else "") }, singleLine = true)
@Composable private fun MenuRow(icon: ImageVector, title: String, subtitle: String, click: () -> Unit) { Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).clickable(onClick = click).padding(10.dp), verticalAlignment = Alignment.CenterVertically) { FeatureIcon(icon); Column(Modifier.weight(1f).padding(horizontal = 14.dp)) { Text(title, fontWeight = FontWeight.SemiBold); Text(subtitle, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis) }; Icon(Icons.Default.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant) } }

private fun daysUntil(value: String?): Long = try { ChronoUnit.DAYS.between(LocalDate.now(), LocalDate.parse(value?.take(10))) } catch (_: Exception) { Long.MAX_VALUE }
private fun dueLabel(value: String?): String { val days = daysUntil(value); return when { days == Long.MAX_VALUE -> tr("Nicht geplant", "Not planned"); days < 0 -> tr("${-days} T. überfällig", "${-days} d overdue"); days == 0L -> tr("Heute", "Today"); days == 1L -> tr("Morgen", "Tomorrow"); else -> tr("In $days Tagen", "In $days days") } }
private fun extractPublicId(value: String): String? = runCatching { Uri.parse(value).takeIf { it.host == "navopass.de" }?.pathSegments?.takeIf { it.firstOrNull() == "p" }?.getOrNull(1) }.getOrNull()
private fun openUrl(context: android.content.Context, url: String) { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(if (url.startsWith("http")) url else BuildConfig.API_URL + url))) }
