import styles from './SceneSwitcher.module.scss';

interface SceneSwitcherProps {
  scenes: string[];
  onSwitch: (sceneKey: string) => void;
}

export function SceneSwitcher({ scenes, onSwitch }: SceneSwitcherProps) {
  return (
    <div className={styles.panel}>
      <span className={styles.label}>Сцены:</span>
      {scenes.map((key) => (
        <button key={key} onClick={() => onSwitch(key)} className={styles.sceneBtn}>
          {key}
        </button>
      ))}
    </div>
  );
}