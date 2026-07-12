import Link from "next/link";
import styles from "../site.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <Link href="/site" className={styles.logoWrap}>
        <div className={styles.logo}>T</div>
        <div>
          <strong>Tukaatu Express</strong>
          <span>Courier Delivery Gateway</span>
        </div>
      </Link>

      <nav className={styles.nav}>
        <Link href="/site">Home</Link>
        <Link href="/site/services">Services</Link>
        <Link href="/site/tracking">Tracking</Link>
        <Link href="/site/contact">Contact</Link>
      </nav>

      <Link href="/login" className={styles.loginBtn}>
        Login
      </Link>
    </header>
  );
}
