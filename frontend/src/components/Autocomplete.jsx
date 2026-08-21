import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';

const Autocomplete = ({
  placeholder = 'Buscar...',
  fetchOptions,
  localOptions = [], // Local options array
  displayValue = (item) => item.name || item.toString(),
  getOptionValue = (item) => item._id || item,
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
  filterParams = {},
  minLength = 2,
  debounceMs = 300
}) => {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Fetch options with debounce
  const fetchOptionsDebounced = useCallback(
    debounce(async (searchQuery) => {
      if (minLength > 0 && searchQuery.length < minLength) {
        setOptions([]);
        setIsOpen(false);
        return;
      }

      setLoading(true);
      try {
        // Use local options if provided, otherwise fetch from API
        if (localOptions.length > 0) {
          const filtered = localOptions.filter(option => {
            const display = displayValue(option).toLowerCase();
            return display.includes(searchQuery.toLowerCase());
          });
          setOptions(filtered);
          setIsOpen(filtered.length > 0);
        } else if (fetchOptions) {
          const results = await fetchOptions(searchQuery, filterParams);
          setOptions(results);
          setIsOpen(results.length > 0);
        }
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Error fetching options:', error);
        setOptions([]);
        setIsOpen(false);
      } finally {
        setLoading(false);
      }
    }, debounceMs),
    [fetchOptions, filterParams, minLength, debounceMs, localOptions, displayValue]
  );

  // Debounce function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Update query when value changes externally
  useEffect(() => {
    if (value) {
      setQuery(displayValue(value));
    } else {
      setQuery('');
    }
  }, [value, displayValue]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setQuery(newValue);
    
    if (minLength === 0 || newValue.length >= minLength) {
      fetchOptionsDebounced(newValue);
    } else {
      setOptions([]);
      setIsOpen(false);
    }
  };

  // Handle focus - load options if minLength is 0
  const handleFocus = () => {
    if (minLength === 0) {
      fetchOptionsDebounced('');
    }
  };

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: `${rect.bottom + window.scrollY}px`,
        left: `${rect.left + window.scrollX}px`,
        width: `${rect.width}px`,
        zIndex: 999999
      });
    }
  }, [isOpen]);

  // Handle option selection
  const handleSelectOption = (option) => {
    const optionValue = getOptionValue(option);
    onChange(optionValue);
    setQuery(displayValue(option));
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Handle clear
  const handleClear = () => {
    setQuery('');
    onChange('');
    setOptions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && query.length >= minLength) {
        e.preventDefault();
        fetchOptionsDebounced(query);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < options.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev > 0 ? prev - 1 : -1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && options[selectedIndex]) {
          handleSelectOption(options[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
      case 'Tab':
        if (selectedIndex >= 0 && options[selectedIndex]) {
          e.preventDefault();
          handleSelectOption(options[selectedIndex]);
        } else {
          setIsOpen(false);
        }
        break;
    }
  };

  // Scroll selected option into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  return (
    <div className="relative" style={{ position: 'relative', zIndex: 50 }}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`form-input pr-10 ${className}`}
        />
        {query && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
          {loading ? (
            <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </div>
      </div>

      {mounted && isOpen && options.length > 0 && createPortal(
        <div
          ref={dropdownRef}
          className="bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
          style={dropdownStyle}
        >
          {options.map((option, index) => (
            <div
              key={getOptionValue(option)}
              onClick={() => handleSelectOption(option)}
              className={`px-4 py-2 cursor-pointer transition-colors ${
                index === selectedIndex
                  ? 'bg-blue-100 text-blue-900'
                  : 'hover:bg-gray-100'
              }`}
            >
              {displayValue(option)}
            </div>
          ))}
        </div>,
        document.body
      )}

      {isOpen && query.length >= minLength && options.length === 0 && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg px-4 py-2 text-gray-500">
          No se encontraron resultados
        </div>
      )}
    </div>
  );
};

export default Autocomplete;
