import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Package, 
  CheckSquare, 
  Square, 
  FileText, 
  Image as ImageIcon,
  ArrowLeft,
  Box,
  Edit,
  X
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useEscapeKey } from '../hooks/useEscapeKey';
import Autocomplete from '../components/Autocomplete';

const LowStockOrders = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [selectedProducts, setSelectedProducts] = useState({});
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editFormData, setEditFormData] = useState({
    minStock: 0,
    idealStock: 0
  });

  // Obtener lista de proveedores
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await axios.get('/api/proveedores');
        if (response.data.success) {
          setSuppliers(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching suppliers:', error);
      }
    };
    fetchSuppliers();
  }, []);

  // Fetch suppliers for autocomplete
  const fetchSuppliersForAutocomplete = async (searchQuery) => {
    try {
      const response = await axios.get('/api/proveedores', { params: { search: searchQuery } });
      if (response.data.success) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('Error al buscar proveedores:', error);
      return [];
    }
  };

  // Obtener productos con bajo stock
  useEffect(() => {
    const fetchLowStockProducts = async () => {
      try {
        setLoading(true);
        const params = selectedSupplier !== 'all' ? { supplierId: selectedSupplier } : {};
        const response = await axios.get('/api/productos/low-stock', { params });
        
        if (response.data.success) {
          const productsWithQuantities = response.data.data.map(product => {
            // Calcular cantidad sugerida con la regla correcta:
            // SI stockActual <= stockMinimo: cantidadAPedir = stockIdeal - stockActual
            // SI stockActual > stockMinimo: cantidadAPedir = 0
            const suggestedQuantity = (product.stock <= product.minStock)
              ? Math.max(0, (product.idealStock || product.minStock) - product.stock)
              : 0;
            
            return {
              ...product,
              quantityToOrder: suggestedQuantity
            };
          });
          setProducts(productsWithQuantities);
          
          // Inicializar cantidades
          const initialQuantities = {};
          productsWithQuantities.forEach(product => {
            initialQuantities[product._id] = product.quantityToOrder;
          });
          setQuantities(initialQuantities);
        }
      } catch (error) {
        console.error('Error fetching low stock products:', error);
        toast.error('Error al cargar productos con bajo stock');
      } finally {
        setLoading(false);
      }
    };
    fetchLowStockProducts();
  }, [selectedSupplier]);

  // Manejar selección de proveedor
  const handleSupplierChange = (e) => {
    setSelectedSupplier(e.target.value);
    setSelectedProducts({});
  };

  // Manejar selección de producto
  const handleProductSelect = (productId) => {
    setSelectedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  // Manejar selección de todos
  const handleSelectAll = () => {
    const allSelected = products.every(p => selectedProducts[p._id]);
    const newSelection = {};
    products.forEach(product => {
      newSelection[product._id] = !allSelected;
    });
    setSelectedProducts(newSelection);
  };

  // Manejar cambio de cantidad
  const handleQuantityChange = (productId, value) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(0, parseInt(value) || 0)
    }));
  };

  // Manejar edición de stock mínimo e ideal
  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setEditFormData({
      minStock: product.minStock || 0,
      idealStock: product.idealStock || 0
    });
    setShowEditModal(true);
  };

  // Calcular cantidad sugerida en tiempo real en el modal
  const calculateSuggestedQuantity = (stock, minStock, idealStock) => {
    if (stock <= minStock) {
      return Math.max(0, idealStock - stock);
    }
    return 0;
  };

  // Guardar cambios de stock mínimo e ideal
  const handleSaveEdit = async () => {
    // Validaciones
    if (editFormData.minStock < 0) {
      toast.error('El stock mínimo no puede ser negativo');
      return;
    }

    if (editFormData.idealStock < 0) {
      toast.error('El stock ideal no puede ser negativo');
      return;
    }

    if (editFormData.idealStock < editFormData.minStock) {
      toast.error('El stock ideal debe ser mayor o igual al stock mínimo');
      return;
    }

    try {
      const response = await axios.put(`/api/productos/${editingProduct._id}`, {
        minStock: editFormData.minStock,
        idealStock: editFormData.idealStock
      });

      if (response.data.success) {
        toast.success('Stock actualizado correctamente');
        setShowEditModal(false);
        setEditingProduct(null);
        
        // Recargar productos para actualizar cálculos
        const params = selectedSupplier !== 'all' ? { supplierId: selectedSupplier } : {};
        const productsResponse = await axios.get('/api/productos/low-stock', { params });
        
        if (productsResponse.data.success) {
          const productsWithQuantities = productsResponse.data.data.map(product => {
            const suggestedQuantity = (product.stock <= product.minStock)
              ? Math.max(0, (product.idealStock || product.minStock) - product.stock)
              : 0;
            
            return {
              ...product,
              quantityToOrder: suggestedQuantity
            };
          });
          setProducts(productsWithQuantities);
          
          const initialQuantities = {};
          productsWithQuantities.forEach(product => {
            initialQuantities[product._id] = product.quantityToOrder;
          });
          setQuantities(initialQuantities);
        }
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Error al actualizar stock');
    }
  };

  // Manejo de ESC para cerrar modal de edición
  useEscapeKey(() => setShowEditModal(false), showEditModal);

  // Obtener productos seleccionados
  const getSelectedProductsList = () => {
    return products.filter(p => selectedProducts[p._id]);
  };

  // Calcular total de unidades
  const getTotalUnits = () => {
    return getSelectedProductsList().reduce((sum, product) => {
      return sum + (quantities[product._id] || 0);
    }, 0);
  };

  // Obtener nombre del proveedor seleccionado
  const getSelectedSupplierName = () => {
    if (selectedSupplier === 'all') return 'Todos los proveedores';
    if (selectedSupplier === 'none') return 'Sin proveedor';
    const supplier = suppliers.find(s => s._id === selectedSupplier);
    return supplier ? supplier.name : 'Proveedor no encontrado';
  };

  // Generar PDF
  const generatePDF = async () => {
    const selectedProductsList = getSelectedProductsList();
    if (selectedProductsList.length === 0) {
      toast.error('Selecciona al menos un producto');
      return;
    }

    try {
      setGenerating(true);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Encabezado
      pdf.setFillColor(139, 58, 58); // Guinda
      pdf.rect(0, 0, pageWidth, 50, 'F');

      // Logo (texto por ahora, se puede agregar imagen)
      pdf.setTextColor(253, 246, 217); // Crema
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('BARBER DOG', margin, 20);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('ESTÉTICA CANINA', margin, 28);
      pdf.text('TEPIC', margin, 35);

      // Título del pedido
      yPosition = 60;
      pdf.setTextColor(139, 58, 58); // Guinda
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PEDIDO DE PRODUCTOS', margin, yPosition);
      yPosition += 10;

      // Información del proveedor
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(60, 60, 60);
      pdf.text(`Proveedor: ${getSelectedSupplierName()}`, margin, yPosition);
      yPosition += 8;

      // Fecha
      const today = new Date();
      const formattedDate = today.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      pdf.text(`Fecha: ${formattedDate}`, margin, yPosition);
      yPosition += 8;

      pdf.text(`Ubicación: Tepic, Nayarit (GMT-7)`, margin, yPosition);
      yPosition += 15;

      // Tabla de productos
      pdf.setFillColor(253, 246, 217); // Crema
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 10, 'F');
      
      pdf.setTextColor(139, 58, 58); // Guinda
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Producto', margin + 5, yPosition + 7);
      pdf.text('SKU', margin + 60, yPosition + 7);
      pdf.text('Stock', margin + 100, yPosition + 7);
      pdf.text('A pedir', margin + 140, yPosition + 7);
      pdf.text('Unidad', margin + 175, yPosition + 7);

      yPosition += 15;
      pdf.setTextColor(60, 60, 60);
      pdf.setFont('helvetica', 'normal');

      selectedProductsList.forEach((product, index) => {
        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.text(product.name.substring(0, 25), margin + 5, yPosition);
        pdf.text(product.sku.substring(0, 10), margin + 60, yPosition);
        pdf.text(product.stock.toString(), margin + 100, yPosition);
        pdf.text(quantities[product._id].toString(), margin + 140, yPosition);
        pdf.text(product.unit, margin + 175, yPosition);
        yPosition += 8;
      });

      // Totales
      yPosition += 10;
      pdf.setFillColor(217, 163, 35); // Amarillo
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Total de productos: ${selectedProductsList.length}`, margin + 5, yPosition + 6);
      pdf.text(`Total de unidades: ${getTotalUnits()}`, margin + 80, yPosition + 6);

      // Guardar PDF
      pdf.save(`pedido_${getSelectedSupplierName().replace(/\s+/g, '_')}_${formattedDate}.pdf`);
      toast.success('PDF generado exitosamente');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar PDF');
    } finally {
      setGenerating(false);
    }
  };

  // Generar imagen
  const generateImage = async () => {
    const selectedProductsList = getSelectedProductsList();
    if (selectedProductsList.length === 0) {
      toast.error('Selecciona al menos un producto');
      return;
    }

    try {
      setGenerating(true);
      
      // Crear elemento temporal para capturar
      const element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.top = '0';
      element.style.width = '800px';
      element.style.padding = '40px';
      element.style.backgroundColor = '#FDF6D9';
      element.style.fontFamily = 'Arial, sans-serif';
      
      const today = new Date();
      const formattedDate = today.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });

      element.innerHTML = `
        <div style="background: #8B3A3A; padding: 20px; margin: -40px -40px 20px -40px; color: #FDF6D9;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">BARBER DOG</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px;">ESTÉTICA CANINA</p>
          <p style="margin: 5px 0 0 0; font-size: 14px;">TEPIC</p>
        </div>
        <h2 style="color: #8B3A3A; margin: 0 0 15px 0; font-size: 20px; font-weight: bold;">PEDIDO DE PRODUCTOS</h2>
        <p style="margin: 5px 0; color: #333;"><strong>Proveedor:</strong> ${getSelectedSupplierName()}</p>
        <p style="margin: 5px 0; color: #333;"><strong>Fecha:</strong> ${formattedDate}</p>
        <p style="margin: 5px 0 20px 0; color: #333;"><strong>Ubicación:</strong> Tepic, Nayarit (GMT-7)</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #D9A323; color: white;">
              <th style="padding: 10px; text-align: left; border: 1px solid #8B3A3A;">Producto</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #8B3A3A;">SKU</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #8B3A3A;">Stock</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #8B3A3A;">A pedir</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #8B3A3A;">Unidad</th>
            </tr>
          </thead>
          <tbody>
            ${selectedProductsList.map(product => `
              <tr style="background: white;">
                <td style="padding: 8px; border: 1px solid #8B3A3A; color: #333;">${product.name}</td>
                <td style="padding: 8px; border: 1px solid #8B3A3A; color: #333;">${product.sku}</td>
                <td style="padding: 8px; border: 1px solid #8B3A3A; color: #333;">${product.stock}</td>
                <td style="padding: 8px; border: 1px solid #8B3A3A; color: #333;">${quantities[product._id]}</td>
                <td style="padding: 8px; border: 1px solid #8B3A3A; color: #333;">${product.unit}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="background: #D9A323; padding: 10px; color: white; display: flex; justify-content: space-between;">
          <span><strong>Total de productos:</strong> ${selectedProductsList.length}</span>
          <span><strong>Total de unidades:</strong> ${getTotalUnits()}</span>
        </div>
      `;

      document.body.appendChild(element);

      const canvas = await html2canvas(element, {
        backgroundColor: '#FDF6D9',
        scale: 2
      });

      document.body.removeChild(element);

      // Descargar imagen
      const link = document.createElement('a');
      link.download = `pedido_${getSelectedSupplierName().replace(/\s+/g, '_')}_${formattedDate}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast.success('Imagen generada exitosamente');
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Error al generar imagen');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-burgundy"></div>
      </div>
    );
  }

  const selectedProductsList = getSelectedProductsList();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-ghost p-2 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-brand-burgundy">Pedidos a Proveedores</h1>
            <p className="mt-1 text-sm text-gray-600">
              Genera pedidos para productos con bajo stock
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Filtrar por proveedor</label>
              <Autocomplete
                placeholder="Todos los proveedores"
                fetchOptions={fetchSuppliersForAutocomplete}
                displayValue={(item) => item.name}
                getOptionValue={(item) => item._id}
                value={selectedSupplier === 'all' || selectedSupplier === 'none' ? null : suppliers.find(s => s._id === selectedSupplier) || null}
                onChange={(value) => handleSupplierChange(value || 'all')}
                minLength={1}
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSupplierChange('all')}
                  className={`text-xs px-2 py-1 rounded ${selectedSupplier === 'all' ? 'bg-brand-burgundy text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => handleSupplierChange('none')}
                  className={`text-xs px-2 py-1 rounded ${selectedSupplier === 'none' ? 'bg-brand-burgundy text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  Sin proveedor
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Información del pedido */}
      {selectedProductsList.length > 0 && (
        <div className="card bg-brand-cream border-brand-burgundy">
          <div className="card-body">
            <div className="flex items-center space-x-2 mb-4">
              <Box className="h-5 w-5 text-brand-burgundy" />
              <h3 className="font-semibold text-brand-burgundy">PEDIDO DE PRODUCTOS</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Proveedor:</span>
                <p className="font-semibold text-brand-burgundy">{getSelectedSupplierName()}</p>
              </div>
              <div>
                <span className="text-gray-600">Productos seleccionados:</span>
                <p className="font-semibold text-brand-burgundy">{selectedProductsList.length}</p>
              </div>
              <div>
                <span className="text-gray-600">Total de unidades:</span>
                <p className="font-semibold text-brand-burgundy">{getTotalUnits()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de productos */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Productos con bajo stock</h3>
            {products.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="text-sm text-brand-burgundy hover:text-brand-burgundy/80 transition-colors flex items-center space-x-1"
              >
                {products.every(p => selectedProducts[p._id]) ? (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    <span>Deseleccionar todos</span>
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4" />
                    <span>Seleccionar todos</span>
                  </>
                )}
              </button>
            )}
          </div>

          {products.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No hay productos con bajo stock</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table-responsive">
                <thead>
                  <tr>
                    <th className="w-10"></th>
                    <th>Producto</th>
                    <th>SKU</th>
                    <th>Proveedor</th>
                    <th>Stock actual</th>
                    <th>Stock mínimo</th>
                    <th>Stock ideal</th>
                    <th>Unidad</th>
                    <th>Cantidad a pedir</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product._id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedProducts[product._id] || false}
                          onChange={() => handleProductSelect(product._id)}
                          className="h-4 w-4 text-brand-burgundy focus:ring-brand-burgundy border-gray-300 rounded"
                        />
                      </td>
                      <td className="font-medium text-gray-900">{product.name}</td>
                      <td className="text-gray-600">{product.sku}</td>
                      <td>
                        {product.supplier ? (
                          <span className="text-sm text-gray-600">
                            {product.supplier.name}
                          </span>
                        ) : (
                          <span className="text-sm text-warning-600">Sin proveedor</span>
                        )}
                      </td>
                      <td className="text-brand-burgundy font-semibold">{product.stock}</td>
                      <td className="text-gray-600">{product.minStock}</td>
                      <td className="text-gray-600">{product.idealStock || '-'}</td>
                      <td className="text-gray-600">{product.unit}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={quantities[product._id] || 0}
                          onChange={(e) => handleQuantityChange(product._id, e.target.value)}
                          className="form-input w-24 text-center"
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleEditProduct(product)}
                          className="text-brand-burgundy hover:text-brand-burgundy/80 transition-colors"
                          title="Editar stock mínimo e ideal"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Botones de acción */}
      {selectedProductsList.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={generatePDF}
            disabled={generating}
            className="btn-primary flex items-center justify-center space-x-2"
          >
            <FileText className="h-4 w-4" />
            <span>{generating ? 'Generando...' : 'Generar PDF'}</span>
          </button>
          <button
            onClick={generateImage}
            disabled={generating}
            className="btn-secondary flex items-center justify-center space-x-2"
          >
            <ImageIcon className="h-4 w-4" />
            <span>{generating ? 'Generando...' : 'Descargar imagen'}</span>
          </button>
        </div>
      )}

      {/* Modal de edición de stock mínimo e ideal */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="modal-overlay" onClick={() => setShowEditModal(false)} />
            
            <div className="relative modal-content max-w-md w-full sm:max-w-md p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Editar Stock - {editingProduct.name}
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Stock actual:</span> {editingProduct.stock}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">SKU:</span> {editingProduct.sku}
                  </p>
                </div>

                <div>
                  <label className="form-label">Stock mínimo</label>
                  <input
                    type="number"
                    min="0"
                    value={editFormData.minStock}
                    onChange={(e) => setEditFormData({...editFormData, minStock: parseInt(e.target.value) || 0})}
                    className="form-input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Nivel en el que el producto se considera en bajo stock
                  </p>
                </div>

                <div>
                  <label className="form-label">Stock ideal</label>
                  <input
                    type="number"
                    min="0"
                    value={editFormData.idealStock}
                    onChange={(e) => setEditFormData({...editFormData, idealStock: parseInt(e.target.value) || 0})}
                    className="form-input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Cantidad que queremos tener disponible después del pedido
                  </p>
                </div>

                <div className="bg-brand-cream border border-brand-burgundy rounded-lg p-3">
                  <p className="text-sm font-medium text-brand-burgundy">
                    Cantidad sugerida: {calculateSuggestedQuantity(editingProduct.stock, editFormData.minStock, editFormData.idealStock)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {editingProduct.stock <= editFormData.minStock
                      ? 'Producto en bajo stock - se sugiere pedido'
                      : 'Producto NO está en bajo stock - no se sugiere pedido'
                    }
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="btn btn-secondary btn-md flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="btn btn-primary btn-md flex-1"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LowStockOrders;
