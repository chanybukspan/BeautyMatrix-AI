import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts } from '../store/slices/productsSlice';
import { addToCart } from '../store/slices/cartSlice';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Link } from 'react-router-dom';
import { ColorSwatches } from '../components/ColorSwatches';
import { RecoloredProductImage } from '../components/RecoloredProductImage';
import axios from 'axios';
import './Products.css';

function Products() {
  const dispatch = useDispatch();
  const { items, pagination, loading, error } = useSelector((state) => state.products);
  
  const [page, setPage] = useState(1);
  const [quantities, setQuantities] = useState({});
  const [selectedColorByProduct, setSelectedColorByProduct] = useState({});
  
  // AI States
  const [aiLoading, setAiLoading] = useState(null); 
  const [aiResult, setAiResult] = useState(null); 
  const [showAiDialog, setShowAiDialog] = useState(false);

  const increaseQuantity = (productId) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1
    }));
  };

  const decreaseQuantity = (productId) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max((prev[productId] || 0) - 1, 0)
    }));
  };

  const handleAddToCart = (product) => {
    const qty = quantities[product._id] || 0;
    if (qty > 0) {
      const colorIndex = selectedColorByProduct[product._id] ?? 0;
      const selectedColor = product.colors?.[colorIndex] 
        ? { name: product.colors[colorIndex].name, hex: product.colors[colorIndex].hex } 
        : null;
      
      dispatch(addToCart({ product, quantity: qty, selectedColor }));
      window.dispatchEvent(new CustomEvent('cart:added', { detail: { name: product.makeupName } }));
      setQuantities(prev => ({ ...prev, [product._id]: 0 }));
    }
  };

  const handleTryOn = async (product) => {
    const userPhoto = sessionStorage.getItem('userPhoto'); 
    
    if (!userPhoto) {
      alert('כדי להשתמש בניסוי הווירטואלי, יש להעלות תמונה בדף "סורק האיפור" תחילה.');
      return;
    }

    setAiLoading(product._id);
    
    try {
      const selectedIndex = selectedColorByProduct[product._id] ?? 0;
      const hex = product.colors?.[selectedIndex]?.hex || '#000000';

      const response = await axios.post('http://localhost:3000/api/ai/try-on', {
        userImageUrl: userPhoto,
        productId: product._id,
        hexColor: hex
      });

      if (response.data.success) {
        setAiResult(response.data.transformedImage);
        setShowAiDialog(true);
      } else {
        throw new Error(response.data.message || 'הניסוי נכשל');
      }
    } catch (err) {
      console.error('AI Try-On Error:', err);
      alert(err.response?.data?.message || 'שגיאה בעיבוד ה-AI. וודאו שהתמונה ברורה ונסו שוב.');
    } finally {
      setAiLoading(null);
    }
  };

  useEffect(() => {
    dispatch(fetchProducts({ page, limit: 12 }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [dispatch, page]);

  if (loading) return <div className="loading-container"><i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }}></i><p>טוען מוצרים...</p></div>;
  if (error) return <div className="error-container"><p>שגיאה בטעינת המוצרים: {error}</p></div>;

  return (
    <div className="products">
      <Dialog 
        header="כך זה נראה עלייך!" 
        visible={showAiDialog} 
        onHide={() => setShowAiDialog(false)}
        style={{ width: '90vw', maxWidth: '500px' }}
        draggable={false}
        resizable={false}
        blockScroll
      >
        <div className="ai-result-content">
          {aiResult && <img src={aiResult} alt="Virtual Try-On Result" className="ai-result-img" />}
          <div className="ai-dialog-footer">
            <Button label="סגור" className="p-button-text" onClick={() => setShowAiDialog(false)} />
          </div>
        </div>
      </Dialog>

      <div className="products-head">
        <h1 className="section-title"><span className="gradient-text">הקולקציה</span> שלנו</h1>
        <p className="section-tagline">חוויית יופי מבוססת בינה מלאכותית — בחרי את הגוון המושלם עבורך</p>
      </div>

      <div className="products-grid">
        {items.map((product, index) => {
          const selectedIndex = selectedColorByProduct[product._id] ?? 0;
          const selectedColorHex = product.colors?.[selectedIndex]?.hex;
          const useRecolor = product.colors?.length > 0 && selectedColorHex;
          const displayImage = product.colors?.[selectedIndex]?.imageUrl || product.imageUrl;
          
          return (
            <div key={product._id} className="product-card" style={{ animationDelay: `${index * 0.05}s` }}>
              <div className="product-card-image-wrap">
                {useRecolor ? (
                  <RecoloredProductImage src={displayImage} alt={product.makeupName} targetHex={selectedColorHex} />
                ) : (
                  <img src={displayImage} alt={product.makeupName} />
                )}
                
                <Button 
                  icon={aiLoading === product._id ? "pi pi-spin pi-spinner" : "pi pi-camera"} 
                  className="try-on-badge-btn"
                  tooltip="נסה עליי (AI)"
                  onClick={() => handleTryOn(product)}
                  disabled={aiLoading !== null}
                />
              </div>

              <div className="product-card-body">
                <span className="brand-tag">{product.brand}</span>
                <h3>{product.makeupName}</h3>
                
                {product.colors && product.colors.length > 0 && (
                  <div className="color-selection-wrap">
                    <ColorSwatches
                      colors={product.colors}
                      selectedIndex={selectedIndex}
                      onSelect={(i) => setSelectedColorByProduct(prev => ({ ...prev, [product._id]: i }))}
                      compact
                    />
                  </div>
                )}
                
                <div className="price-stock-row">
                  <p className="price">₪{product.price}</p>
                  <span className={`stock-status ${product.inStock ? 'in' : 'out'}`}>
                    {product.inStock ? 'במלאי' : 'אזל'}
                  </span>
                </div>
                
                <div className="qty-selector">
                  <Button icon="pi pi-minus" className="p-button-rounded" onClick={() => decreaseQuantity(product._id)} disabled={!quantities[product._id]} />
                  <span className="qty-number">{quantities[product._id] || 0}</span>
                  <Button icon="pi pi-plus" className="p-button-rounded" onClick={() => increaseQuantity(product._id)} />
                </div>
              </div>

              <div className="product-card-actions">
                <Link to={`/product/${product._id}`} className="details-link">
                  <Button label="פרטים" icon="pi pi-info-circle" className="btn-details" />
                </Link>
                <Button 
                  label="הוסף לסל" 
                  icon="pi pi-shopping-cart" 
                  className="btn-add-cart"
                  onClick={() => handleAddToCart(product)}
                  disabled={!product.inStock || !quantities[product._id]}
                />
              </div>
            </div>
          );
        })}
      </div>

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <Button icon="pi pi-chevron-right" disabled={!pagination.hasPrevPage} onClick={() => setPage(page - 1)} />
          <span>עמוד {pagination.currentPage} מתוך {pagination.totalPages}</span>
          <Button icon="pi pi-chevron-left" disabled={!pagination.hasNextPage} onClick={() => setPage(page + 1)} />
        </div>
      )}
    </div>
  );
}

export default Products;