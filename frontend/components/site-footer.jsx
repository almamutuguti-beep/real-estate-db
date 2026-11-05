export function SiteFooter() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--line)',
        background: 'var(--cream)',
        padding: '20px 40px',
        color: 'var(--muted)',
        fontSize: 12,
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10,
      }}
    >
      <span>© {new Date().getFullYear()} Velora. All rights reserved.</span>
      <span>Property management made simple.</span>
    </footer>
  );
}
