import styles from './social-links.module.css';

export default function SocialLinks({ mobile = false }: { mobile?: boolean }) {
  return <div className={`${styles.group} ${mobile ? styles.mobile : styles.desktop}`} role="group" aria-label="Réseaux sociaux i-ateliers">
    <a className={`${styles.link} ${styles.instagram}`} href="https://www.instagram.com/iateliers_formations/" target="_blank" rel="noreferrer" aria-label="Instagram i-ateliers" title="Instagram">
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.7" y="3.7" width="16.6" height="16.6" rx="4.8"/><circle cx="12" cy="12" r="3.8"/><circle cx="17.4" cy="6.8" r=".9" className={styles.dot}/></svg>
    </a>
    <a className={`${styles.link} ${styles.facebook}`} href="https://www.facebook.com/iateliers/" target="_blank" rel="noreferrer" aria-label="Facebook i-ateliers" title="Facebook">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.1 20.5v-7.3h2.5l.4-2.8h-2.9V8.6c0-.8.3-1.4 1.5-1.4H17V4.7c-.5-.1-1.3-.2-2.2-.2-2.3 0-3.9 1.4-3.9 4v1.9H8.3v2.8h2.6v7.3h3.2Z"/></svg>
    </a>
  </div>;
}
