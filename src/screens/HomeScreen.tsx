import { BarcodeIcon, CartIcon, ShelfIcon } from '../components/icons';
import { useItems } from '../data/hooks';

export function HomeScreen() {
  const items = useItems();
  const inStock = items?.filter((i) => i.quantity > 0).length;
  const needed = items?.filter((i) => i.quantity === 0).length;

  return (
    <main className="screen home">
      <h1 className="home__title">Pantry</h1>

      <nav className="home__actions" aria-label="Main">
        <a className="big-btn big-btn--scan" href="#/scan">
          <BarcodeIcon />
          <span className="big-btn__label">Scan item</span>
        </a>
        <a className="big-btn" href="#/pantry">
          <ShelfIcon />
          <span className="big-btn__label">My pantry</span>
          {inStock !== undefined && (
            <span className="tag" aria-label={`${inStock} ${inStock === 1 ? 'item' : 'items'}`}>
              {inStock}
            </span>
          )}
        </a>
        <a className="big-btn" href="#/need">
          <CartIcon />
          <span className="big-btn__label">Need to buy</span>
          {needed !== undefined && (
            <span
              className={needed > 0 ? 'tag tag--alert' : 'tag'}
              aria-label={`${needed} ${needed === 1 ? 'item' : 'items'}`}
            >
              {needed}
            </span>
          )}
        </a>
      </nav>

      <div className="home__more">
        <a className="link-btn" href="#/add">
          Add something without a barcode
        </a>
        <a className="link-btn" href="#/share">
          Share this pantry
        </a>
        <a className="link-btn" href="#/backup">
          Back up my pantry
        </a>
      </div>
    </main>
  );
}
