/**
 * useOTAUpdate — no-op stub
 *
 * OTA updates via the Expo Updates Protocol are not active in this build.
 * The expo-updates plugin has been removed from app.json because MinIO static
 * file hosting cannot serve the multipart, signed-manifest responses required
 * by expo-updates v29 (Expo Updates Protocol v1).
 *
 * Current OTA distribution model:
 *   - Bundles are exported and stored in MinIO (`vayyari-updates` bucket) via
 *     `push-update.sh` for archival and future rollback reference.
 *   - End users receive app updates by downloading and installing the latest
 *     APK from the internal publish share:
 *       http://krikanserver.taild227d9.ts.net/publish/vayyari/
 *
 * Future work (ADO #336 follow-up):
 *   - Implement a lightweight Node/Go Expo Updates Protocol v1 server that
 *     proxies MinIO and adds the required multipart headers + manifest signing,
 *     then re-enable expo-updates in app.json.
 *   - OR: Use EAS Update (expo.dev) for managed OTA — requires EAS project setup.
 */
export function useOTAUpdate(): void {
  // no-op — OTA auto-update is not active in this build.
}
