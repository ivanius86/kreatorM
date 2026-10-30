param(
    [string]$SourceDirectory = 'C:\Users\Ivan Stefanovic\Downloads\Zalihe i namirnice',
    [string]$OutputDirectory = (Join-Path $PSScriptRoot '../assets/nutrition'),
    [int]$Padding = 16
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class NutritionSheetCropper {
    public static Rectangle VisibleBounds(Bitmap image) {
        Rectangle region = new Rectangle(0, 0, image.Width, image.Height);
        BitmapData data = image.LockBits(region, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        try {
            byte[] row = new byte[image.Width * 4];
            int left = image.Width, top = image.Height, right = -1, bottom = -1;
            for (int y = 0; y < image.Height; y++) {
                Marshal.Copy(IntPtr.Add(data.Scan0, y * data.Stride), row, 0, row.Length);
                for (int x = 0; x < image.Width; x++) {
                    if (row[x * 4 + 3] == 0) continue;
                    left = Math.Min(left, x); right = Math.Max(right, x);
                    top = Math.Min(top, y); bottom = Math.Max(bottom, y);
                }
            }
            return right < 0 ? Rectangle.Empty : Rectangle.FromLTRB(left, top, right + 1, bottom + 1);
        } finally { image.UnlockBits(data); }
    }

    public static string Crop(string sheetPath, int column, int row, string destination, int padding) {
        using (Bitmap sheet = new Bitmap(sheetPath)) {
            if (sheet.Width % 3 != 0 || sheet.Height % 2 != 0)
                throw new InvalidOperationException("Sheet dimensions must divide into an exact 3 x 2 grid.");
            int width = sheet.Width / 3, height = sheet.Height / 2;
            Rectangle cellRegion = new Rectangle(column * width, row * height, width, height);
            using (Bitmap cell = sheet.Clone(cellRegion, PixelFormat.Format32bppArgb)) {
                Rectangle visible = VisibleBounds(cell);
                if (visible.IsEmpty) throw new InvalidOperationException("Cell is entirely transparent: " + destination);
                Rectangle trim = Rectangle.FromLTRB(
                    Math.Max(0, visible.Left - padding), Math.Max(0, visible.Top - padding),
                    Math.Min(width, visible.Right + padding), Math.Min(height, visible.Bottom + padding));
                using (Bitmap result = cell.Clone(trim, PixelFormat.Format32bppArgb)) {
                    // Clone rectangles only; no drawing, resampling, background fill or alpha changes.
                    result.Save(destination, ImageFormat.Png);
                }
                bool edge = visible.Left == 0 || visible.Top == 0 || visible.Right == width || visible.Bottom == height;
                return String.Format("{0}: {1}x{2}, cell ({3},{4}), trim ({5},{6}), cell-edge artwork={7}",
                    System.IO.Path.GetFileName(destination), trim.Width, trim.Height, column, row, trim.X, trim.Y, edge);
            }
        }
    }
}
'@

if ($Padding -lt 0) { throw 'Padding must be nonnegative.' }
$sheetMappings = @(
    @{ Source = 'Sheet 1 mapping.png'; Files = @('Zivina.png', 'Jaja.png', 'PekarskiProizvodi.png', 'Testenina.png', 'Mahunarke.png', 'OrasastiPlodovi.png') },
    @{ Source = 'Sheet 2 mapping.png'; Files = @('MastiIUlja.png', 'Zacini.png', 'Pica.png', 'GotovaJela.png', 'GrickaliceISlatkisi.png', 'Ostalo.png') }
)
foreach ($sheet in $sheetMappings) {
    if (-not (Test-Path -LiteralPath (Join-Path $SourceDirectory $sheet.Source))) { throw ('Missing sheet: ' + $sheet.Source) }
}
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
foreach ($sheet in $sheetMappings) {
    for ($index = 0; $index -lt 6; $index++) {
        [NutritionSheetCropper]::Crop(
            (Join-Path $SourceDirectory $sheet.Source), $index % 3, [int][Math]::Floor($index / 3),
            (Join-Path $OutputDirectory $sheet.Files[$index]), $Padding)
    }
}
