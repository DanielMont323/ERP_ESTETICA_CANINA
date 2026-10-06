import React from 'react';

const Pagination = ({ pagination, onPageChange, onLimitChange }) => {
  const { page, limit, total, pages } = pagination;

  if (pages <= 1) return null;

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisible = window.innerWidth < 640 ? 3 : 5; // Show fewer pages on mobile
    
    if (pages <= maxVisible) {
      for (let i = 1; i <= pages; i++) {
        pageNumbers.push(i);
      }
    } else if (page <= Math.ceil(maxVisible / 2)) {
      for (let i = 1; i <= maxVisible; i++) {
        pageNumbers.push(i);
      }
    } else if (page >= pages - Math.ceil(maxVisible / 2) + 1) {
      for (let i = pages - maxVisible + 1; i <= pages; i++) {
        pageNumbers.push(i);
      }
    } else {
      for (let i = page - Math.floor(maxVisible / 2); i <= page + Math.floor(maxVisible / 2); i++) {
        pageNumbers.push(i);
      }
    }
    
    return pageNumbers;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
      <div className="text-xs sm:text-sm text-gray-500">
        Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, total)} de {total} registros
      </div>
      
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
        <div className="flex items-center gap-2">
          <label className="text-xs sm:text-sm text-gray-600">Por página:</label>
          <select
            value={limit}
            onChange={(e) => onLimitChange(parseInt(e.target.value))}
            className="form-input py-1 px-2 text-xs sm:text-sm w-20"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-center sm:justify-start">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none"
          >
            Anterior
          </button>
          
          <div className="flex items-center gap-1 flex-1 sm:flex-none justify-center">
            {getPageNumbers().map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`btn btn-sm ${page === pageNum ? 'btn-primary' : 'btn-secondary'} flex-1 sm:flex-none`}
              >
                {pageNum}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === pages}
            className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
