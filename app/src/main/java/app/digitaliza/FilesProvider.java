package app.digitaliza;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;

import java.io.File;
import java.io.FileNotFoundException;
import java.util.List;

/**
 * Provedor mínimo para compartilhar arquivos do app com outros apps
 * (câmera grava a foto aqui; PDFs são abertos/compartilhados a partir daqui).
 * Áreas: content://<pacote>.files/capture/<nome>  e  content://<pacote>.files/docs/<nome>
 */
public class FilesProvider extends ContentProvider {

    public static Uri uriFor(Context c, String area, String name) {
        return new Uri.Builder()
                .scheme("content")
                .authority(c.getPackageName() + ".files")
                .appendPath(area)
                .appendPath(name)
                .build();
    }

    static File dirFor(Context c, String area) {
        if ("capture".equals(area)) return new File(c.getCacheDir(), "capture");
        if ("docs".equals(area)) return new File(c.getFilesDir(), "docs");
        return null;
    }

    private File resolve(Uri uri) throws FileNotFoundException {
        List<String> seg = uri.getPathSegments();
        if (seg == null || seg.size() != 2) throw new FileNotFoundException("Caminho inválido");
        String name = seg.get(1);
        if (name.contains("/") || name.contains("\\") || name.startsWith(".")) {
            throw new FileNotFoundException("Nome inválido");
        }
        File dir = dirFor(getContext(), seg.get(0));
        if (dir == null) throw new FileNotFoundException("Área inválida");
        dir.mkdirs();
        return new File(dir, name);
    }

    @Override
    public boolean onCreate() {
        return true;
    }

    @Override
    public String getType(Uri uri) {
        String p = uri.getLastPathSegment();
        if (p == null) return null;
        p = p.toLowerCase();
        if (p.endsWith(".pdf")) return "application/pdf";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        return "application/octet-stream";
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        File f = resolve(uri);
        return ParcelFileDescriptor.open(f, ParcelFileDescriptor.parseMode(mode));
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        File f;
        try {
            f = resolve(uri);
        } catch (FileNotFoundException e) {
            return null;
        }
        String[] cols = projection != null ? projection
                : new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE};
        MatrixCursor c = new MatrixCursor(cols, 1);
        Object[] row = new Object[cols.length];
        for (int i = 0; i < cols.length; i++) {
            if (OpenableColumns.DISPLAY_NAME.equals(cols[i])) row[i] = f.getName();
            else if (OpenableColumns.SIZE.equals(cols[i])) row[i] = f.length();
            else row[i] = null;
        }
        c.addRow(row);
        return c;
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        throw new UnsupportedOperationException();
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        return 0;
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        return 0;
    }
}
