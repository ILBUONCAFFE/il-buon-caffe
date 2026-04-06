/**
 * Launch Configuration — Production Feature Gates
 * 
 * Central config for features that are not yet available on the live site.
 * When a feature is ready, flip the flag to `true` and redeploy.
 * 
 * ⚠️  After changing flags, run `turbo build --filter=web` to verify.
 */

/** Sklep — czy zakupy online są aktywne (dodawanie do koszyka, checkout, płatności) */
export const SHOP_ENABLED = false;

/** Konta użytkowników — czy logowanie i rejestracja są aktywne */
export const ACCOUNTS_ENABLED = false;

/** Przewidywana data uruchomienia sklepu */
export const SHOP_LAUNCH_DATE = 'Lato 2026';

/** Przewidywana data uruchomienia kont */
export const ACCOUNTS_LAUNCH_DATE = 'Zima 2026';
