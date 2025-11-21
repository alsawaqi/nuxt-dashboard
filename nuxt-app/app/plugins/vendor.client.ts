// app/plugins/vendor.client.ts
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = false; // keep order
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export default defineNuxtPlugin(async () => {
  if ((window as any).__VENDOR_LOADED__) {
    // already loaded once on this page -> don't re-run on HMR
    return;
  }
  (window as any).__VENDOR_LOADED__ = true;

  await loadScript("/vendor/jquery-3.7.1.min.js");
  (window as any).$ = (window as any).jQuery = (window as any).$;

  await loadScript("/vendor/bootstrap.bundle.min.js");
  await loadScript("/vendor/dataTables.min.js");
  await loadScript("/vendor/iconify-icon.min.js");
  await loadScript("/vendor/jquery-ui.min.js");
  await loadScript("/vendor/jquery-jvectormap-2.0.5.min.js");
  await loadScript("/vendor/jquery-jvectormap-world-mill-en.js");
  await loadScript("/vendor/magnifc-popup.min.js");
  await loadScript("/vendor/slick.min.js");
  await loadScript("/vendor/prism.js");
  await loadScript("/vendor/file-upload.js");
  await loadScript("/vendor/audioplayer.js");

  // finally your template's main JS
  await loadScript("/vendor/app.js");
});
