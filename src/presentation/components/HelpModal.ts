import {
  ShortcutConfig,
  KeyBinding,
  ShortcutAction,
} from '../../features/core/domain/ShortcutConfig';
import { LayoutSwitcher } from '../logic/LayoutSwitcher';

export class HelpModal {
  constructor() {
    // Modal will be appended to document.body
  }

  public show(
    shortcuts: ShortcutConfig,
    locale: 'en' | 'ja',
    layoutSwitcher?: LayoutSwitcher,
  ): void {
    if (typeof document === 'undefined') return;

    const modalOverlay = document.createElement('div');
    modalOverlay.style.position = 'fixed';
    modalOverlay.style.top = '0';
    modalOverlay.style.left = '0';
    modalOverlay.style.width = '100vw';
    modalOverlay.style.height = '100vh';
    modalOverlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modalOverlay.style.zIndex = '3000';
    modalOverlay.style.display = 'flex';
    modalOverlay.style.justifyContent = 'center';
    modalOverlay.style.alignItems = 'center';
    modalOverlay.style.opacity = '0';
    modalOverlay.style.transition = 'opacity 0.2s';

    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = 'white';
    modalContent.style.padding = '20px';
    modalContent.style.borderRadius = '8px';
    modalContent.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    modalContent.style.maxWidth = '600px';
    modalContent.style.width = '90%';
    modalContent.style.maxHeight = '90vh';
    modalContent.style.overflowY = 'auto';
    modalContent.style.position = 'relative';

    const title = document.createElement('h2');
    title.textContent = locale === 'ja' ? 'ヘルプ' : 'Help';
    title.style.margin = '0 0 15px 0';
    title.style.fontSize = '1.5em';
    title.style.borderBottom = '1px solid #eee';
    title.style.paddingBottom = '10px';
    modalContent.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '10px';
    closeBtn.style.right = '15px';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.fontSize = '24px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.color = '#999';
    closeBtn.addEventListener('click', () => {
      closeModal();
    });
    modalContent.appendChild(closeBtn);

    // 1. Toolbar Icons Section
    if (layoutSwitcher) {
      const iconSectionTitle = document.createElement('h3');
      iconSectionTitle.textContent = locale === 'ja' ? 'ツールバーアイコン' : 'Toolbar Icons';
      iconSectionTitle.style.marginTop = '10px';
      iconSectionTitle.style.marginBottom = '10px';
      iconSectionTitle.style.fontSize = '1.2em';
      iconSectionTitle.style.color = '#333';
      iconSectionTitle.style.borderBottom = '1px solid #f0f0f0';
      modalContent.appendChild(iconSectionTitle);

      const iconTable = document.createElement('table');
      iconTable.style.width = '100%';
      iconTable.style.borderCollapse = 'collapse';
      iconTable.style.fontSize = '0.9em';
      iconTable.style.marginBottom = '20px';

      const iconDescriptions = layoutSwitcher.getIconDescriptions(locale);

      iconDescriptions.forEach((item) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #f9f9f9';

        const tdIcon = document.createElement('td');
        tdIcon.style.padding = '8px';
        tdIcon.style.width = '40px';
        tdIcon.style.textAlign = 'center';

        let iconSvg = '';
        switch (item.id) {
          case 'right':
            iconSvg = layoutSwitcher.getRightIcon();
            break;
          case 'left':
            iconSvg = layoutSwitcher.getLeftIcon();
            break;
          case 'both':
            iconSvg = layoutSwitcher.getBothIcon();
            break;
          case 'default':
            iconSvg = layoutSwitcher.getThemeDefaultIcon();
            break;
          case 'simple':
            iconSvg = layoutSwitcher.getThemeSimpleIcon();
            break;
          case 'colorful':
            iconSvg = layoutSwitcher.getThemeColorfulIcon();
            break;
          case 'custom':
            iconSvg = layoutSwitcher.getThemeCustomIcon();
            break;
          case 'resetZoom':
            iconSvg = layoutSwitcher.getZoomResetIcon();
            break;
          case 'help':
            iconSvg = layoutSwitcher.getHelpIcon();
            break;
        }

        const iconContainer = document.createElement('div');
        iconContainer.style.width = '24px';
        iconContainer.style.height = '24px';
        iconContainer.style.display = 'flex';
        iconContainer.style.alignItems = 'center';
        iconContainer.style.justifyContent = 'center';
        iconContainer.style.color = '#555';
        iconContainer.innerHTML = iconSvg;
        tdIcon.appendChild(iconContainer);

        const tdDesc = document.createElement('td');
        tdDesc.textContent = item.desc;
        tdDesc.style.padding = '8px';
        tdDesc.style.textAlign = 'left';
        tdDesc.style.color = '#333';

        tr.appendChild(tdIcon);
        tr.appendChild(tdDesc);
        iconTable.appendChild(tr);
      });
      modalContent.appendChild(iconTable);
    }

    // 2. Keyboard Shortcuts Section
    const sections = [
      {
        title: locale === 'ja' ? '一般' : 'General',
        actions: [
          {
            action: 'openCommandPalette',
            desc: 'Open Command Palette',
            descJa: 'コマンドパレットを開く',
          },
          { action: 'navUp', desc: 'Move Selection Up', descJa: 'ノード間の移動 (上)' },
          { action: 'navDown', desc: 'Move Selection Down', descJa: 'ノード間の移動 (下)' },
          { action: 'navLeft', desc: 'Move Selection Left', descJa: 'ノード間の移動 (左)' },
          { action: 'navRight', desc: 'Move Selection Right', descJa: 'ノード間の移動 (右)' },
          {
            action: 'beginEdit',
            desc: 'Start Editing (Zoom if Image)',
            descJa: 'ノードの編集を開始 (画像の場合はズーム)',
          },
          { action: 'addSibling', desc: 'Add Sibling (Below)', descJa: '兄弟ノードを追加 (下)' },
          {
            action: 'addSiblingBefore',
            desc: 'Add Sibling (Above)',
            descJa: '兄弟ノードを追加 (上)',
          },
          { action: 'addChild', desc: 'Add Child', descJa: '子ノードを追加' },
          { action: 'insertParent', desc: 'Insert Parent', descJa: '親ノードを挿入' },
          { action: 'deleteNode', desc: 'Delete Node', descJa: 'ノードを削除' },
          { action: 'undo', desc: 'Undo', descJa: '元に戻す (Undo)' },
          { action: 'redo', desc: 'Redo', descJa: 'やり直し (Redo)' },
          { action: 'copy', desc: 'Copy', descJa: 'コピー' },
          { action: 'cut', desc: 'Cut', descJa: '切り取り' },
          { action: 'paste', desc: 'Paste', descJa: '貼り付け (画像も可)' },
          { action: 'toggleFold', desc: 'Toggle Fold', descJa: 'ノードの展開/折り畳み' },
          { action: 'zoomIn', desc: 'Canvas Zoom In', descJa: 'キャンバス拡大' },
          { action: 'zoomOut', desc: 'Canvas Zoom Out', descJa: 'キャンバス縮小' },
          { action: 'resetZoom', desc: 'Reset Zoom', descJa: 'ズームリセット' },
          { key: 'Drag (Canvas)', desc: 'Pan Board', descJa: '画面のパン (移動)' },
          { key: 'Wheel', desc: 'Vertical Scroll', descJa: '上下スクロール (パン)' },
          { key: 'Shift + Wheel', desc: 'Horizontal Scroll', descJa: '左右スクロール (パン)' },
          { key: 'Ctrl/Cmd + Wheel', desc: 'Zoom', descJa: 'ズームイン/アウト' },
        ],
      },
      {
        title: locale === 'ja' ? '編集 (テキスト入力)' : 'Editing (Text Input)',
        actions: [
          { key: 'Enter', desc: 'Confirm Edit', descJa: '編集を確定' },
          { key: 'Shift + Enter', desc: 'New Line', descJa: '改行' },
          { key: 'Esc', desc: 'Cancel Edit', descJa: '編集をキャンセル' },
        ],
      },
      {
        title: locale === 'ja' ? 'スタイリング (選択中)' : 'Styling (Selection)',
        actions: [
          { action: 'bold', desc: 'Toggle Bold', descJa: '太字 (Bold) 切り替え' },
          { action: 'italic', desc: 'Toggle Italic', descJa: '斜体 (Italic) 切り替え' },
          { action: 'selectColor1', desc: 'Color 1', descJa: 'ノードの色を変更 (1)' },
          { action: 'selectColor2', desc: 'Color 2', descJa: 'ノードの色を変更 (2)' },
          { action: 'selectColor3', desc: 'Color 3', descJa: 'ノードの色を変更 (3)' },
          { action: 'selectColor4', desc: 'Color 4', descJa: 'ノードの色を変更 (4)' },
          { action: 'selectColor5', desc: 'Color 5', descJa: 'ノードの色を変更 (5)' },
          { action: 'selectColor6', desc: 'Color 6', descJa: 'ノードの色を変更 (6)' },
          { action: 'selectColor7', desc: 'Color 7', descJa: 'ノードの色を変更 (7)' },
          { action: 'increaseFontSize', desc: 'Increase Font Size', descJa: 'フォントサイズ拡大' },
          { action: 'decreaseFontSize', desc: 'Decrease Font Size', descJa: 'フォントサイズ縮小' },
        ],
      },
    ];

    sections.forEach((section) => {
      const rows: { key: string; desc: string }[] = [];
      section.actions.forEach((item) => {
        let keyDisplay = '';
        const actionItem = item as {
          action?: ShortcutAction;
          key?: string;
          desc: string;
          descJa?: string;
        };

        if (actionItem.key) {
          keyDisplay = actionItem.key;
        } else if (actionItem.action && shortcuts[actionItem.action]) {
          const bindings = shortcuts[actionItem.action];
          if (bindings && bindings.length > 0) {
            const displays = bindings.map((b: KeyBinding) => {
              const parts = [];
              if (b.ctrlKey || b.metaKey) parts.push('Ctrl/Cmd');
              if (b.altKey) parts.push('Alt');
              if (b.shiftKey) parts.push('Shift');
              if (b.key === ' ') parts.push('Space');
              else parts.push(b.key);
              return parts.join(' + ');
            });
            keyDisplay = [...new Set(displays)].join(' / ');
          }
        }

        if (keyDisplay) {
          rows.push({
            key: keyDisplay,
            desc: locale === 'ja' ? actionItem.descJa || actionItem.desc : actionItem.desc,
          });
        }
      });

      if (rows.length === 0) return;

      const sectionTitle = document.createElement('h3');
      sectionTitle.textContent = section.title;
      sectionTitle.style.marginTop = '20px';
      sectionTitle.style.marginBottom = '10px';
      sectionTitle.style.fontSize = '1.2em';
      sectionTitle.style.color = '#333';
      sectionTitle.style.borderBottom = '1px solid #f0f0f0';
      modalContent.appendChild(sectionTitle);

      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.fontSize = '0.9em';

      const thead = document.createElement('tr');
      thead.style.borderBottom = '2px solid #ddd';
      const thKey = document.createElement('th');
      thKey.textContent = locale === 'ja' ? 'キー' : 'Key';
      thKey.style.textAlign = 'center';
      thKey.style.padding = '8px 0';
      thKey.style.width = '40%';
      thKey.style.color = '#666';
      const thDesc = document.createElement('th');
      thDesc.textContent = locale === 'ja' ? '説明' : 'Description';
      thDesc.style.textAlign = 'center';
      thDesc.style.padding = '8px 0';
      thDesc.style.color = '#666';
      thead.appendChild(thKey);
      thead.appendChild(thDesc);
      table.appendChild(thead);

      rows.forEach((row) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #f9f9f9';
        const tdKey = document.createElement('td');
        tdKey.textContent = row.key;
        tdKey.style.padding = '6px 0';
        tdKey.style.fontWeight = 'bold';
        tdKey.style.color = '#555';
        tdKey.style.minWidth = '180px';
        tdKey.style.textAlign = 'center';
        const tdDesc = document.createElement('td');
        tdDesc.textContent = row.desc;
        tdDesc.style.padding = '6px 0';
        tdDesc.style.textAlign = 'left';
        tdDesc.style.color = '#333';
        tr.appendChild(tdKey);
        tr.appendChild(tdDesc);
        table.appendChild(tr);
      });
      modalContent.appendChild(table);
    });

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    requestAnimationFrame(() => {
      modalOverlay.style.opacity = '1';
    });

    const closeModal = () => {
      modalOverlay.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(modalOverlay)) {
          document.body.removeChild(modalOverlay);
        }
      }, 200);
      document.removeEventListener('keydown', handleEsc);
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleEsc);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });
  }
}
