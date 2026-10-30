package app.digitaliza;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Matrix;
import android.graphics.pdf.PdfRenderer;
import android.media.ExifInterface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelFileDescriptor;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.util.Base64;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {

    static final String HOST = "app.local";
    static final String BASE = "https://" + HOST + "/";
    static final int REQ_PICK = 11, REQ_CAMERA = 12, REQ_EXPORT = 13;
    static final int MAX_SIDE = 3000;      // lado máximo das imagens de trabalho
    static final int PDF_MAX_SIDE = 2800;  // lado máximo ao renderizar páginas de PDF
    static final float PDF_DPI = 220f;
    static final int INK = 0xFF0E1014;

    private WebView web;
    private File pendingCapture;
    private String pendingExportName;
    private Intent pendingShareIntent;
    private boolean webReady = false;

    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final Handler ui = new Handler(Looper.getMainLooper());

    private FileOutputStream docOut;
    private File docFile;

    interface StreamSource {
        InputStream open() throws IOException;
    }

    // ------------------------------------------------------------------ ciclo de vida

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        if (state != null) {
            String p = state.getString("pendingCapture");
            if (p != null) pendingCapture = new File(p);
            pendingExportName = state.getString("pendingExportName");
        }

        Window w = getWindow();
        w.setStatusBarColor(INK);
        w.setNavigationBarColor(INK);
        if (Build.VERSION.SDK_INT >= 30) {
            w.setDecorFitsSystemWindows(false);
        } else {
            w.getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(INK);
        web = new WebView(this);
        web.setBackgroundColor(INK);
        root.addView(web, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);

        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int l, t, r, b;
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets i = insets.getInsets(WindowInsets.Type.systemBars()
                        | WindowInsets.Type.ime() | WindowInsets.Type.displayCutout());
                l = i.left; t = i.top; r = i.right; b = i.bottom;
            } else {
                l = insets.getSystemWindowInsetLeft();
                t = insets.getSystemWindowInsetTop();
                r = insets.getSystemWindowInsetRight();
                b = insets.getSystemWindowInsetBottom();
            }
            v.setPadding(l, t, r, b);
            return insets;
        });

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setTextZoom(100);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.addJavascriptInterface(new Bridge(), "Android");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (!HOST.equals(u.getHost())) return null;
                return serve(u.getPath());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                return !HOST.equals(req.getUrl().getHost());
            }
        });

        cleanWorkDir();
        pendingShareIntent = getIntent();
        web.loadUrl(BASE + "assets/index.html");
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        pendingShareIntent = intent;
        if (webReady) handleShareIntent();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        if (pendingCapture != null) out.putString("pendingCapture", pendingCapture.getAbsolutePath());
        if (pendingExportName != null) out.putString("pendingExportName", pendingExportName);
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.App ? App.onBack() : false", value -> {
            if (!"true".equals(value)) super.onBackPressed();
        });
    }

    @Override
    protected void onDestroy() {
        worker.shutdownNow();
        if (web != null) web.destroy();
        super.onDestroy();
    }

    // ------------------------------------------------------------------ servidor local

    private WebResourceResponse serve(String path) {
        try {
            if (path != null && path.startsWith("/assets/")) {
                String p = path.substring("/assets/".length());
                if (p.contains("..")) throw new IOException();
                return response(mimeOf(p), getAssets().open("web/" + p));
            }
            if (path != null && path.startsWith("/work/")) {
                File f = safeFile(workDir(), path.substring("/work/".length()));
                if (f != null && f.exists()) return response("image/jpeg", new FileInputStream(f));
            }
        } catch (IOException ignored) {
        }
        Map<String, String> h = new HashMap<>();
        return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", h,
                new ByteArrayInputStream(new byte[0]));
    }

    private WebResourceResponse response(String mime, InputStream in) {
        Map<String, String> h = new HashMap<>();
        h.put("Cache-Control", "no-store");
        h.put("Access-Control-Allow-Origin", "*");
        String enc = mime.startsWith("text/") || mime.contains("javascript") ? "utf-8" : null;
        return new WebResourceResponse(mime, enc, 200, "OK", h, in);
    }

    private static String mimeOf(String p) {
        p = p.toLowerCase();
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
    }

    private File workDir() {
        File d = new File(getCacheDir(), "work");
        d.mkdirs();
        return d;
    }

    private File docsDir() {
        File d = new File(getFilesDir(), "docs");
        d.mkdirs();
        return d;
    }

    private static File safeFile(File dir, String name) {
        if (name == null || name.isEmpty() || name.contains("/") || name.contains("\\")
                || name.startsWith(".")) return null;
        return new File(dir, name);
    }

    private void cleanWorkDir() {
        File[] fs = workDir().listFiles();
        if (fs != null) for (File f : fs) f.delete();
        File cap = new File(getCacheDir(), "capture");
        File[] cs = cap.listFiles();
        if (cs != null) for (File f : cs) {
            if (pendingCapture == null || !f.equals(pendingCapture)) f.delete();
        }
    }

    // ------------------------------------------------------------------ ponte JS

    private void js(String fn, Object... args) {
        StringBuilder sb = new StringBuilder("window.App && App.").append(fn).append("(");
        for (int i = 0; i < args.length; i++) {
            if (i > 0) sb.append(",");
            Object a = args[i];
            if (a == null) sb.append("null");
            else if (a instanceof String) sb.append(JSONObject.quote((String) a));
            else sb.append(a.toString());
        }
        sb.append(")");
        String code = sb.toString();
        ui.post(() -> {
            if (web != null) web.evaluateJavascript(code, null);
        });
    }

    private void toast(String m) {
        ui.post(() -> Toast.makeText(this, m, Toast.LENGTH_SHORT).show());
    }

    public class Bridge {

        @JavascriptInterface
        public void ready() {
            ui.post(() -> {
                webReady = true;
                handleShareIntent();
            });
        }

        @JavascriptInterface
        public void pickFiles() {
            ui.post(() -> {
                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                i.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/*", "application/pdf"});
                i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                try {
                    startActivityForResult(i, REQ_PICK);
                } catch (ActivityNotFoundException e) {
                    Intent g = new Intent(Intent.ACTION_GET_CONTENT);
                    g.addCategory(Intent.CATEGORY_OPENABLE);
                    g.setType("*/*");
                    g.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/*", "application/pdf"});
                    g.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    try {
                        startActivityForResult(g, REQ_PICK);
                    } catch (ActivityNotFoundException e2) {
                        js("onImportError", "Nenhum gerenciador de arquivos disponível.");
                    }
                }
            });
        }

        @JavascriptInterface
        public void openCamera() {
            ui.post(() -> {
                try {
                    File dir = new File(getCacheDir(), "capture");
                    dir.mkdirs();
                    pendingCapture = new File(dir, "cap_" + System.currentTimeMillis() + ".jpg");
                    Uri out = FilesProvider.uriFor(MainActivity.this, "capture", pendingCapture.getName());
                    Intent i = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                    i.putExtra(MediaStore.EXTRA_OUTPUT, out);
                    i.setClipData(ClipData.newRawUri("", out));
                    i.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivityForResult(i, REQ_CAMERA);
                } catch (Exception e) {
                    js("onImportError", "Não foi possível abrir a câmera neste aparelho.");
                }
            });
        }

        @JavascriptInterface
        public String beginDoc(String requested) {
            try {
                closeDocQuietly();
                String base = requested == null ? "" : requested;
                base = base.replaceAll("[\\\\/:*?\"<>|\\r\\n\\t]", "_").trim();
                if (base.toLowerCase().endsWith(".pdf")) base = base.substring(0, base.length() - 4).trim();
                if (base.isEmpty() || base.startsWith(".")) base = "Documento";
                if (base.length() > 80) base = base.substring(0, 80);
                String name = base + ".pdf";
                int n = 2;
                while (new File(docsDir(), name).exists()) name = base + " (" + (n++) + ").pdf";
                docFile = new File(docsDir(), name);
                docOut = new FileOutputStream(docFile);
                return name;
            } catch (IOException e) {
                return "";
            }
        }

        @JavascriptInterface
        public boolean appendDoc(String b64) {
            try {
                docOut.write(Base64.decode(b64, Base64.DEFAULT));
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public String finishDoc() {
            try {
                docOut.flush();
                docOut.getFD().sync();
                docOut.close();
                docOut = null;
                return docInfo(docFile).toString();
            } catch (Exception e) {
                return "";
            }
        }

        @JavascriptInterface
        public String listDocs() {
            JSONArray arr = new JSONArray();
            File[] fs = docsDir().listFiles((d, n) -> n.toLowerCase().endsWith(".pdf"));
            if (fs != null) {
                Arrays.sort(fs, (a, b) -> Long.compare(b.lastModified(), a.lastModified()));
                for (File f : fs) {
                    try {
                        arr.put(docInfo(f));
                    } catch (Exception ignored) {
                    }
                }
            }
            return arr.toString();
        }

        @JavascriptInterface
        public void openDoc(String name) {
            ui.post(() -> {
                File f = safeFile(docsDir(), name);
                if (f == null || !f.exists()) { toast("Arquivo não encontrado"); return; }
                Intent i = new Intent(Intent.ACTION_VIEW);
                i.setDataAndType(FilesProvider.uriFor(MainActivity.this, "docs", f.getName()), "application/pdf");
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try {
                    startActivity(i);
                } catch (ActivityNotFoundException e) {
                    toast("Instale um leitor de PDF para abrir o arquivo");
                }
            });
        }

        @JavascriptInterface
        public void shareDoc(String name) {
            ui.post(() -> {
                File f = safeFile(docsDir(), name);
                if (f == null || !f.exists()) { toast("Arquivo não encontrado"); return; }
                Uri u = FilesProvider.uriFor(MainActivity.this, "docs", f.getName());
                Intent i = new Intent(Intent.ACTION_SEND);
                i.setType("application/pdf");
                i.putExtra(Intent.EXTRA_STREAM, u);
                i.putExtra(Intent.EXTRA_SUBJECT, f.getName());
                i.setClipData(ClipData.newRawUri(f.getName(), u));
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try {
                    startActivity(Intent.createChooser(i, "Compartilhar PDF"));
                } catch (ActivityNotFoundException e) {
                    toast("Nenhum app disponível para compartilhar");
                }
            });
        }

        @JavascriptInterface
        public void exportDoc(String name) {
            ui.post(() -> {
                File f = safeFile(docsDir(), name);
                if (f == null || !f.exists()) { toast("Arquivo não encontrado"); return; }
                pendingExportName = f.getName();
                Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("application/pdf");
                i.putExtra(Intent.EXTRA_TITLE, f.getName());
                try {
                    startActivityForResult(i, REQ_EXPORT);
                } catch (ActivityNotFoundException e) {
                    toast("Não foi possível abrir o seletor de pastas");
                }
            });
        }

        @JavascriptInterface
        public boolean deleteDoc(String name) {
            File f = safeFile(docsDir(), name);
            return f != null && f.delete();
        }

        @JavascriptInterface
        public void deleteWork(String name) {
            File f = safeFile(workDir(), name);
            if (f != null) f.delete();
        }

        @JavascriptInterface
        public void toast(String msg) {
            MainActivity.this.toast(msg);
        }

        @JavascriptInterface
        public String version() {
            try {
                return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            } catch (Exception e) {
                return "1.0";
            }
        }
    }

    private JSONObject docInfo(File f) throws Exception {
        JSONObject o = new JSONObject();
        o.put("name", f.getName());
        o.put("size", f.length());
        o.put("mtime", f.lastModified());
        return o;
    }

    private void closeDocQuietly() {
        if (docOut != null) {
            try { docOut.close(); } catch (IOException ignored) { }
            docOut = null;
        }
    }

    // ------------------------------------------------------------------ resultados

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == REQ_PICK) {
            if (res != RESULT_OK || data == null) { js("onImportCancel"); return; }
            List<Uri> uris = new ArrayList<>();
            ClipData cd = data.getClipData();
            if (cd != null) {
                for (int i = 0; i < cd.getItemCount(); i++) {
                    Uri u = cd.getItemAt(i).getUri();
                    if (u != null) uris.add(u);
                }
            } else if (data.getData() != null) {
                uris.add(data.getData());
            }
            importUris(uris);
        } else if (req == REQ_CAMERA) {
            final File cap = pendingCapture;
            pendingCapture = null;
            if (res == RESULT_OK && cap != null && cap.exists() && cap.length() > 0) {
                importCapture(cap);
            } else {
                if (cap != null) cap.delete();
                js("onImportCancel");
            }
        } else if (req == REQ_EXPORT) {
            String name = pendingExportName;
            pendingExportName = null;
            if (res != RESULT_OK || data == null || data.getData() == null || name == null) return;
            Uri target = data.getData();
            worker.execute(() -> {
                File f = safeFile(docsDir(), name);
                try (InputStream in = new FileInputStream(f);
                     OutputStream out = getContentResolver().openOutputStream(target, "w")) {
                    copy(in, out);
                    toast("PDF salvo com sucesso");
                } catch (Exception e) {
                    toast("Não foi possível salvar o PDF");
                }
            });
        }
    }

    private void handleShareIntent() {
        Intent it = pendingShareIntent;
        pendingShareIntent = null;
        if (it == null || it.getAction() == null) return;
        List<Uri> uris = new ArrayList<>();
        try {
            if (Intent.ACTION_SEND.equals(it.getAction())) {
                Uri u = it.getParcelableExtra(Intent.EXTRA_STREAM);
                if (u != null) uris.add(u);
            } else if (Intent.ACTION_SEND_MULTIPLE.equals(it.getAction())) {
                ArrayList<Uri> list = it.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
                if (list != null) uris.addAll(list);
            }
        } catch (Exception ignored) {
        }
        if (!uris.isEmpty()) importUris(uris);
    }

    // ------------------------------------------------------------------ importação

    private void importUris(List<Uri> uris) {
        if (uris.isEmpty()) { js("onImportCancel"); return; }
        js("onImportStart", uris.size());
        worker.execute(() -> {
            JSONArray out = new JSONArray();
            JSONArray errors = new JSONArray();
            int idx = 0;
            for (Uri u : uris) {
                idx++;
                String name = displayName(u);
                js("onImportProgress", "Lendo arquivo " + idx + " de " + uris.size(), idx - 1, uris.size());
                try {
                    String mime = getContentResolver().getType(u);
                    boolean pdf = "application/pdf".equals(mime)
                            || (name != null && name.toLowerCase().endsWith(".pdf"));
                    if (pdf) {
                        renderPdf(u, name, out);
                    } else {
                        decodeImage(() -> getContentResolver().openInputStream(u), name, "image", out);
                    }
                } catch (SecurityException se) {
                    errors.put((name != null ? name : "Arquivo") + ": protegido por senha ou sem permissão");
                } catch (OutOfMemoryError oom) {
                    errors.put((name != null ? name : "Arquivo") + ": muito grande para processar");
                } catch (Exception e) {
                    errors.put((name != null ? name : "Arquivo") + ": formato não suportado");
                }
            }
            js("onPagesAdded", out.toString(), errors.toString());
        });
    }

    private void importCapture(File cap) {
        js("onImportStart", 1);
        worker.execute(() -> {
            JSONArray out = new JSONArray();
            JSONArray errors = new JSONArray();
            try {
                decodeImage(() -> new FileInputStream(cap), "Foto", "camera", out);
            } catch (Throwable e) {
                errors.put("Não foi possível ler a foto");
            } finally {
                cap.delete();
            }
            js("onPagesAdded", out.toString(), errors.toString());
        });
    }

    private String displayName(Uri u) {
        try (Cursor c = getContentResolver().query(u, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (c != null && c.moveToFirst()) return c.getString(0);
        } catch (Exception ignored) {
        }
        String s = u.getLastPathSegment();
        return s != null ? s : "Arquivo";
    }

    private void decodeImage(StreamSource src, String name, String origin, JSONArray out) throws Exception {
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inJustDecodeBounds = true;
        try (InputStream in = src.open()) {
            BitmapFactory.decodeStream(in, null, o);
        }
        if (o.outWidth <= 0 || o.outHeight <= 0) throw new IOException("Imagem inválida");

        int sample = 1;
        while (Math.max(o.outWidth, o.outHeight) / (sample * 2) >= MAX_SIDE) sample *= 2;
        BitmapFactory.Options d = new BitmapFactory.Options();
        d.inSampleSize = sample;
        d.inPreferredConfig = Bitmap.Config.ARGB_8888;
        Bitmap bmp;
        try (InputStream in = src.open()) {
            bmp = BitmapFactory.decodeStream(in, null, d);
        }
        if (bmp == null) throw new IOException("Imagem inválida");

        int orientation = ExifInterface.ORIENTATION_NORMAL;
        try (InputStream in = src.open()) {
            orientation = new ExifInterface(in).getAttributeInt(
                    ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL);
        } catch (Exception ignored) {
        }

        Matrix m = new Matrix();
        float scale = Math.min(1f, (float) MAX_SIDE / Math.max(bmp.getWidth(), bmp.getHeight()));
        if (scale < 1f) m.postScale(scale, scale);
        switch (orientation) {
            case ExifInterface.ORIENTATION_ROTATE_90: m.postRotate(90); break;
            case ExifInterface.ORIENTATION_ROTATE_180: m.postRotate(180); break;
            case ExifInterface.ORIENTATION_ROTATE_270: m.postRotate(270); break;
            case ExifInterface.ORIENTATION_FLIP_HORIZONTAL: m.postScale(-1, 1); break;
            case ExifInterface.ORIENTATION_FLIP_VERTICAL: m.postScale(1, -1); break;
            case ExifInterface.ORIENTATION_TRANSPOSE: m.postRotate(90); m.postScale(-1, 1); break;
            case ExifInterface.ORIENTATION_TRANSVERSE: m.postRotate(270); m.postScale(-1, 1); break;
            default: break;
        }
        if (!m.isIdentity()) {
            Bitmap t = Bitmap.createBitmap(bmp, 0, 0, bmp.getWidth(), bmp.getHeight(), m, true);
            if (t != bmp) bmp.recycle();
            bmp = t;
        }
        if (bmp.hasAlpha()) {
            Bitmap flat = Bitmap.createBitmap(bmp.getWidth(), bmp.getHeight(), Bitmap.Config.ARGB_8888);
            Canvas c = new Canvas(flat);
            c.drawColor(Color.WHITE);
            c.drawBitmap(bmp, 0, 0, null);
            bmp.recycle();
            bmp = flat;
        }
        saveWork(bmp, name, origin, 0, out);
        bmp.recycle();
    }

    private void renderPdf(Uri u, String name, JSONArray out) throws Exception {
        File tmp = new File(getCacheDir(), "import_" + System.nanoTime() + ".pdf");
        try {
            try (InputStream in = getContentResolver().openInputStream(u);
                 OutputStream os = new FileOutputStream(tmp)) {
                if (in == null) throw new IOException();
                copy(in, os);
            }
            try (ParcelFileDescriptor pfd = ParcelFileDescriptor.open(tmp, ParcelFileDescriptor.MODE_READ_ONLY);
                 PdfRenderer r = new PdfRenderer(pfd)) {
                int n = Math.min(r.getPageCount(), 300);
                for (int i = 0; i < n; i++) {
                    js("onImportProgress", "Lendo página " + (i + 1) + " de " + n, i, n);
                    try (PdfRenderer.Page p = r.openPage(i)) {
                        float s = PDF_DPI / 72f;
                        int w = Math.round(p.getWidth() * s), h = Math.round(p.getHeight() * s);
                        float k = Math.min(1f, (float) PDF_MAX_SIDE / Math.max(w, h));
                        w = Math.max(1, Math.round(w * k));
                        h = Math.max(1, Math.round(h * k));
                        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
                        bmp.eraseColor(Color.WHITE);
                        p.render(bmp, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
                        saveWork(bmp, name, "pdf", i + 1, out);
                        bmp.recycle();
                    }
                }
            }
        } finally {
            tmp.delete();
        }
    }

    private void saveWork(Bitmap bmp, String name, String origin, int page, JSONArray out) throws Exception {
        String fn = "p_" + UUID.randomUUID().toString().replace("-", "") + ".jpg";
        File f = new File(workDir(), fn);
        try (OutputStream os = new FileOutputStream(f)) {
            bmp.compress(Bitmap.CompressFormat.JPEG, 94, os);
        }
        JSONObject o = new JSONObject();
        o.put("url", BASE + "work/" + fn);
        o.put("file", fn);
        o.put("w", bmp.getWidth());
        o.put("h", bmp.getHeight());
        o.put("origin", origin);
        o.put("name", name == null ? "" : name);
        o.put("page", page);
        out.put(o);
    }

    private static void copy(InputStream in, OutputStream out) throws IOException {
        byte[] buf = new byte[64 * 1024];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        out.flush();
    }
}
