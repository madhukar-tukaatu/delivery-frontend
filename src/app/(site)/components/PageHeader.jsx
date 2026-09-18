import styles from './PageHeader.module.css';

const PageHeader = ({ title, description, lastUpdated }) => {
  return (
    <div className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.content}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.description}>{description}</p>
      </div>
    </div>
  );
};

export default PageHeader;
