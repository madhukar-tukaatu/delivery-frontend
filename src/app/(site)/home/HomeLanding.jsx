import Header from "../components/Header";
import CinematicHero from "./CinematicHero";
import styles from "./HomeLanding.module.css";

export default function HomeLanding() {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <Header transparent />
      <main id="main-content" tabIndex={-1}>
        <CinematicHero />
      </main>
    </div>
  );
}
