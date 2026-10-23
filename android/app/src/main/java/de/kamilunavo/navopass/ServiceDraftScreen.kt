package de.kamilunavo.navopass

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import java.time.LocalDate
import java.util.Locale

private fun draftText(de:String,en:String)=if(Locale.getDefault().language=="de")de else en

/** Local fields survive rotation but are keyed to the verified owner, never another account. */
@Composable fun ServiceDraftScreen(model:NavoViewModel,passFilter:String?,onBack:()->Unit) {
    val changes by model.draftChanges.collectAsState()
    val store=model.serviceDrafts
    val owner=store.currentOwner
    var savedOwner by rememberSaveable {mutableStateOf(owner)}
    var selected by rememberSaveable(owner) {mutableStateOf<String?>(null)}
    var editing by rememberSaveable(owner) {mutableStateOf(false)}
    var editingPass by rememberSaveable(owner) {mutableStateOf<String?>(null)}
    var title by rememberSaveable(owner) {mutableStateOf("")}
    var notes by rememberSaveable(owner) {mutableStateOf("")}
    var provider by rememberSaveable(owner) {mutableStateOf("")}
    var day by rememberSaveable(owner) {mutableStateOf("")}
    var typeName by rememberSaveable(owner) {mutableStateOf("NOTE")}
    var original by rememberSaveable(owner) {mutableStateOf<List<String>>(emptyList())}
    var confirmDiscard by rememberSaveable(owner) {mutableStateOf(false)}
    var localError by rememberSaveable(owner) {mutableStateOf(false)}
    // Read changes: the coordinator publishes only AFTER its durable write succeeds.
    val value=remember(changes,selected,owner) {store.drafts.firstOrNull {it.draftId==selected}}
    fun fields()=listOf(title,notes,provider,day,typeName)
    fun leaveEditor() {editing=false;localError=false;title="";notes="";provider="";day="";original=emptyList()}
    fun back() {if(editing && fields()!=original)confirmDiscard=true else if(editing)leaveEditor() else if(selected!=null)selected=null else onBack()}
    fun edit(pass:String,draft:ServiceDraft?) {
        editingPass=pass;selected=draft?.draftId;title=draft?.title.orEmpty();notes=draft?.description.orEmpty()
        provider=draft?.provider.orEmpty();day=draft?.eventDate ?: LocalDate.now().toString();typeName=draft?.eventType?.name ?: "NOTE"
        original=fields();localError=false;editing=true
    }
    LaunchedEffect(owner) {
        if(savedOwner!=owner) {leaveEditor();selected=null;editingPass=null;savedOwner=owner}
    }
    BackHandler {back()}
    Scaffold(topBar={Column(Modifier.statusBarsPadding().padding(horizontal=16.dp)) {
        TextButton(onClick={back()}) {Text(draftText("Zurück","Back"))}
        Text(draftText("Offline-Serviceentwürfe","Offline service drafts"),style=MaterialTheme.typography.headlineSmall)
    }}) {padding->
        Column(Modifier.padding(padding).fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(20.dp),verticalArrangement=Arrangement.spacedBy(14.dp)) {
            if(store.locked || owner==null || savedOwner!=owner) {
                Text(draftText("Entwürfe sind gesperrt. Bestätige deine Sitzung online. Nicht lesbare Daten werden nicht ersetzt.","Drafts are locked. Verify your session online. Unreadable data is never replaced."))
                Button(onClick={model.verifyDraftSession()}) {Text(draftText("Sitzung bestätigen","Verify session"))}
            } else if(editing) {
                Text(draftText("Nur lokal. Keine Veröffentlichung beim Speichern.","Local only. Saving does not publish."))
                OutlinedTextField(title,{title=it},Modifier.fillMaxWidth(),label={Text(draftText("Titel (max. 180 Zeichen)","Title (up to 180 characters)"))})
                OutlinedTextField(day,{day=it},Modifier.fillMaxWidth(),label={Text(draftText("Ereignistag (JJJJ-MM-TT)","Event day (YYYY-MM-DD)"))},singleLine=true)
                OutlinedTextField(provider,{provider=it},Modifier.fillMaxWidth(),label={Text(draftText("Dienstleister (max. 200 Zeichen)","Provider (up to 200 characters)"))})
                OutlinedTextField(notes,{notes=it},Modifier.fillMaxWidth(),label={Text(draftText("Notizen (max. 4000 Zeichen)","Notes (up to 4000 characters)"))},minLines=5)
                ServiceDraftType.entries.forEach { type->
                    Row {RadioButton(typeName==type.name,{typeName=type.name});TextButton(onClick={typeName=type.name}) {Text(if(type==ServiceDraftType.NOTE)draftText("Notiz","Note") else draftText("Service","Service"))}}
                }
                val valid=runCatching {ServiceDraft.create(owner,requireNotNull(editingPass),"Validation",day,title,notes,provider,ServiceDraftType.valueOf(typeName))}.isSuccess
                if(!valid)Text(draftText("Titel, gültigen Kalendertag und Textgrenzen prüfen.","Check the title, valid calendar day and text limits."),color=MaterialTheme.colorScheme.error)
                Button(onClick={
                    val saved=runCatching {
                        val id=selected
                        if(id==null)selected=store.create(requireNotNull(editingPass),day,title,notes,provider,ServiceDraftType.valueOf(typeName)).draftId
                        else store.update(id,day,title,notes,provider,ServiceDraftType.valueOf(typeName))
                    }
                    if(saved.isSuccess)leaveEditor() else localError=true
                },enabled=valid,modifier=Modifier.fillMaxWidth()) {Text(draftText("Lokal speichern","Save locally"))}
            } else if(value!=null) {
                Text(value.passLabel,style=MaterialTheme.typography.titleLarge)
                Text(value.title,style=MaterialTheme.typography.headlineSmall)
                Text("${value.eventDate} · ${value.eventType.name} · ${draftText("Revision","Revision")} ${value.revision}")
                Text(draftStatus(value.state));Text(value.description);if(value.provider.isNotEmpty())Text(value.provider)
                Text(draftText("Lokal erfasst: ","Captured locally: ")+java.time.Instant.ofEpochMilli(value.capturedAt).toString())
                value.receipt?.let {receipt->
                    Text(draftText("Serverbeleg (privater Eintrag)","Server receipt (private entry)"),style=MaterialTheme.typography.titleMedium)
                    Text(receipt.eventId);Text(receipt.digest)
                }
                Text(draftText("Veröffentlichen prüft die aktuellen Rechte online. Nach unklarer Antwort wird exakt dieselbe Revision erneut gesendet.","Publishing checks current access online. After an uncertain response, the exact same revision is retried."))
                if(value.state in setOf(ServiceDraftState.LOCAL,ServiceDraftState.PUBLISHING,ServiceDraftState.UNKNOWN))
                    Button(onClick={store.publish(value.draftId)},enabled=value.draftId !in store.sending,modifier=Modifier.fillMaxWidth()) {
                        Text(if(value.state==ServiceDraftState.LOCAL)draftText("Jetzt privat veröffentlichen","Publish privately now") else draftText("Gleiche Revision erneut senden","Retry same revision"))
                    }
                if(value.state in setOf(ServiceDraftState.LOCAL,ServiceDraftState.DELIVERED,ServiceDraftState.BLOCKED))
                    OutlinedButton(onClick={edit(value.passId,value)},modifier=Modifier.fillMaxWidth()) {Text(if(value.state==ServiceDraftState.LOCAL)draftText("Bearbeiten","Edit") else draftText("Neue lokale Revision","New local revision"))}
            } else {
                Text(draftText("Textentwürfe bleiben auf diesem Gerät. Kein automatisches Senden. Abmelden löscht die lokalen Entwürfe dieses Kontos.","Text drafts stay on this device. Nothing is sent automatically. Signing out deletes this account’s local drafts."))
                Text(draftText("Pass zuerst online mit Bearbeitungsrecht öffnen. Die gespeicherte Beobachtung garantiert keine späteren Rechte.","First open an editable pass online. The saved observation does not guarantee future access."))
                val contexts=store.contexts.filter {passFilter==null || it.passId==passFilter}
                if(contexts.isEmpty())Text(draftText("Noch kein bearbeitbarer Pass auf diesem Gerät geöffnet.","No editable pass has been opened on this device yet."))
                contexts.forEach {context->OutlinedButton(onClick={edit(context.passId,null)},modifier=Modifier.fillMaxWidth()) {Text(draftText("Neuer Entwurf: ","New draft: ")+context.label)}}
                HorizontalDivider();Text(draftText("Entwürfe und Belege","Drafts and receipts"),style=MaterialTheme.typography.titleLarge)
                val drafts=store.drafts.filter {passFilter==null || it.passId==passFilter}
                if(drafts.isEmpty())Text(draftText("Noch keine lokalen Entwürfe.","No local drafts yet."))
                drafts.forEach {draft->OutlinedButton(onClick={selected=draft.draftId},modifier=Modifier.fillMaxWidth()) {Column {Text(draft.title);Text(draft.passLabel+" · "+draft.eventDate);Text(draftStatus(draft.state))}}}
            }
            if(localError || store.actionFailed)Text(draftText("Aktion nicht abgeschlossen. Vorhandene Daten bleiben erhalten. Prüfe Speicher, Sitzung und Verbindung vor einem erneuten Versuch.","Action not completed. Existing data is preserved. Check storage, session and connection before retrying."),color=MaterialTheme.colorScheme.error)
            Spacer(Modifier.height(24.dp))
        }
    }
    if(confirmDiscard)AlertDialog(onDismissRequest={confirmDiscard=false},title={Text(draftText("Änderungen verwerfen?","Discard changes?"))},text={Text(draftText("Nicht gespeicherte Eingaben gehen verloren.","Unsaved input will be lost."))},confirmButton={TextButton(onClick={confirmDiscard=false;leaveEditor()}) {Text(draftText("Verwerfen","Discard"))}},dismissButton={TextButton(onClick={confirmDiscard=false}) {Text(draftText("Weiter bearbeiten","Keep editing"))}})
}
private fun draftStatus(state:ServiceDraftState)=when(state) {
    ServiceDraftState.LOCAL->draftText("Nur lokal","Local only")
    ServiceDraftState.PUBLISHING,ServiceDraftState.UNKNOWN->draftText("Antwort unklar – gleiche Revision erneut senden","Response uncertain — retry same revision")
    ServiceDraftState.DELIVERED->draftText("Veröffentlicht – Beleg lokal gespeichert","Published — receipt saved locally")
    ServiceDraftState.BLOCKED->draftText("Veröffentlichung gesperrt – Rechte oder Revision prüfen","Publication blocked — check access or revision")
}
