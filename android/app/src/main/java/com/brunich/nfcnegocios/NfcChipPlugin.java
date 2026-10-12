package com.brunich.nfcnegocios;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.nfc.tech.Ndef;
import android.nfc.tech.NdefFormatable;
import android.os.Parcelable;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Lee y graba los chips con el lector NFC del teléfono, sin pasar por el navegador.
// Usa el modo lector: mientras la app espera un chip, Android no abre otra app al acercarlo.
@CapacitorPlugin(name = "NfcChip")
public class NfcChipPlugin extends Plugin {
    private PluginCall pending;
    private String toWrite;
    private String launch;

    @Override
    public void load() {
        launch = chipUrl(getActivity().getIntent());
    }

    @PluginMethod
    public void status(PluginCall call) {
        NfcAdapter nfc = NfcAdapter.getDefaultAdapter(getContext());
        JSObject r = new JSObject();
        r.put("supported", nfc != null);
        r.put("enabled", nfc != null && nfc.isEnabled());
        call.resolve(r);
    }

    // El enlace del chip con el que se abrió la app, una sola vez.
    @PluginMethod
    public void launchUrl(PluginCall call) {
        JSObject r = new JSObject();
        r.put("url", launch);
        launch = null;
        call.resolve(r);
    }

    @PluginMethod
    public void read(PluginCall call) {
        start(call, null);
    }

    @PluginMethod
    public void write(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) { call.reject("Falta el enlace", "no-url"); return; }
        start(call, url);
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        stop();
        if (pending != null) { pending.reject("Cancelado", "cancelled"); pending = null; }
        call.resolve();
    }

    private void start(PluginCall call, String url) {
        NfcAdapter nfc = NfcAdapter.getDefaultAdapter(getContext());
        if (nfc == null) { call.reject("Este teléfono no tiene NFC", "no-nfc"); return; }
        if (!nfc.isEnabled()) { call.reject("El NFC está apagado", "nfc-off"); return; }
        if (pending != null) pending.reject("Cancelado", "cancelled");
        pending = call;
        toWrite = url;
        listen();
    }

    private void listen() {
        Activity a = getActivity();
        NfcAdapter nfc = NfcAdapter.getDefaultAdapter(getContext());
        if (nfc == null || a == null) return;
        int flags = NfcAdapter.FLAG_READER_NFC_A | NfcAdapter.FLAG_READER_NFC_B | NfcAdapter.FLAG_READER_NFC_F | NfcAdapter.FLAG_READER_NFC_V;
        a.runOnUiThread(() -> nfc.enableReaderMode(a, this::onTag, flags, null));
    }

    private void stop() {
        Activity a = getActivity();
        NfcAdapter nfc = NfcAdapter.getDefaultAdapter(getContext());
        if (nfc != null && a != null) a.runOnUiThread(() -> nfc.disableReaderMode(a));
    }

    private void onTag(Tag tag) {
        PluginCall call = pending;
        if (call == null) return;
        try {
            JSObject r = toWrite == null ? readTag(tag) : writeTag(tag, toWrite);
            pending = null;
            stop();
            call.resolve(r);
        } catch (ChipError e) {
            pending = null;
            stop();
            call.reject(e.getMessage(), e.code);
        } catch (Exception e) {
            // Se movió el chip a medio camino: se queda esperando para que lo vuelvan a acercar.
            notifyListeners("retry", new JSObject());
        }
    }

    private JSObject readTag(Tag tag) throws Exception {
        JSObject r = new JSObject();
        Ndef ndef = Ndef.get(tag);
        if (ndef == null) { r.put("url", ""); r.put("empty", true); return r; }
        ndef.connect();
        try {
            NdefMessage msg = ndef.getNdefMessage();
            r.put("url", msg == null ? "" : firstUri(msg));
            r.put("size", ndef.getMaxSize());
            r.put("writable", ndef.isWritable());
            r.put("type", ndef.getType());
        } finally { ndef.close(); }
        return r;
    }

    private JSObject writeTag(Tag tag, String url) throws Exception {
        NdefMessage msg = new NdefMessage(new NdefRecord[]{NdefRecord.createUri(url)});
        int need = msg.toByteArray().length;
        JSObject r = new JSObject();
        Ndef ndef = Ndef.get(tag);
        if (ndef != null) {
            ndef.connect();
            try {
                if (!ndef.isWritable()) throw new ChipError("El chip está bloqueado contra escritura", "read-only");
                if (ndef.getMaxSize() < need) throw new ChipError("El enlace no cabe en este chip", "too-small");
                ndef.writeNdefMessage(msg);
                // Se vuelve a leer para comprobar que quedó lo mismo.
                NdefMessage back = ndef.getNdefMessage();
                r.put("verified", back != null && url.equals(firstUri(back)));
                r.put("size", ndef.getMaxSize());
            } finally { ndef.close(); }
            r.put("bytes", need);
            return r;
        }
        NdefFormatable blank = NdefFormatable.get(tag);
        if (blank == null) throw new ChipError("Este chip no sirve para enlaces (no es NDEF)", "not-ndef");
        blank.connect();
        try { blank.format(msg); } finally { blank.close(); }
        r.put("verified", false);
        r.put("bytes", need);
        return r;
    }

    private static String firstUri(NdefMessage msg) {
        for (NdefRecord rec : msg.getRecords()) {
            Uri u = rec.toUri();
            if (u != null) return u.toString();
        }
        return "";
    }

    private static String chipUrl(Intent intent) {
        if (intent == null || !NfcAdapter.ACTION_NDEF_DISCOVERED.equals(intent.getAction())) return null;
        Parcelable[] raw = intent.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES);
        if (raw != null && raw.length > 0) { String u = firstUri((NdefMessage) raw[0]); if (!u.isEmpty()) return u; }
        return intent.getDataString();
    }

    // Con la app abierta, acercar un chip del negocio abre su tarjeta o su menú ahí mismo.
    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        String url = chipUrl(intent);
        if (url == null) return;
        JSObject r = new JSObject();
        r.put("url", url);
        notifyListeners("chip", r, true);
    }

    @Override
    protected void handleOnPause() {
        super.handleOnPause();
        if (pending != null) stop();
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        if (pending != null) listen();
    }

    private static class ChipError extends Exception {
        final String code;
        ChipError(String message, String code) { super(message); this.code = code; }
    }
}
