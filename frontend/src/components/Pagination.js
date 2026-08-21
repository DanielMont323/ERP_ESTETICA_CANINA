import React from 'react';

const Pagination = ({ pagination, onPageChange, onLimitChange }) => {
  const { page, limit, total, pages } = pagination;

  if (pages <= 1) return null;

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisible = 5;
    
    if (pages <= maxVisible) {
      for (let i = 1; i <= pages; i++) {
        pageNumbers.push(i);
      }
    } else if (page <= 3) {
      for (let i = 1; i <= maxVisible; i++) {
        pageNumbers.push(i);
      }
    } else if (page >= pages - 2) {
      for (let i = pages - maxVisible + 1; i <= pages; i++) {
        pageNumbers.push(i);
      }
    } else {
      for (let i = page - 2; i <= page + 2; i++) {
        pageNumbers.push(i);
      }
    }
    
    return pageNumbers;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200">
      <div className="text-sm text-gray-500">
        Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, total)} de {total} registros
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Por página:</label>
          <select
            value={limit}
            onChange={(e) => onLimitChange(parseInt(e.target.value))}
            className="form-input py-1 px-2 text-sm w-20"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          
          <div className="flex items-center gap-1">
            {getPageNumbers().map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`btn btn-sm ${page === pageNum ? 'btn-primary' : 'btn-secondary'}`}
              >
                {pageNum}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === pages}
            className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
