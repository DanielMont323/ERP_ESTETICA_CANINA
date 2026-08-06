import React from 'react';

const Skeleton = ({ className = '', variant = 'default', width, height }) => {
  const baseClasses = 'skeleton';
  
  const variantClasses = {
    default: 'h-4 w-full',
    text: 'skeleton-text w-full',
    title: 'skeleton-title w-3/4',
    avatar: 'skeleton-avatar h-10 w-10',
    button: 'h-10 w-24 rounded-lg',
    input: 'h-10 w-full',
    card: 'h-32 w-full',
    circle: 'rounded-full',
    rectangle: 'rounded-lg',
  };

  const classes = `${baseClasses} ${variantClasses[variant] || variantClasses.default} ${className}`;
  const style = {
    width: width || undefined,
    height: height || undefined,
  };

  return <div className={classes} style={style} />;
};

const SkeletonCard = () => (
  <div className="card p-6 space-y-4">
    <Skeleton variant="title" className="w-1/2" />
    <Skeleton variant="text" />
    <Skeleton variant="text" className="w-2/3" />
    <div className="flex space-x-4 pt-4">
      <Skeleton variant="button" />
      <Skeleton variant="button" />
    </div>
  </div>
);

const SkeletonTable = ({ rows = 5, columns = 4 }) => (
  <div className="card overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200 space-y-3">
      <Skeleton variant="title" className="w-1/3" />
      <Skeleton variant="input" />
    </div>
    <div className="p-6 space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              variant="text" 
              className="flex-1"
              style={{ width: colIndex === 0 ? '30%' : undefined }}
            />
          ))}
        </div>
      ))}
    </div>
  </div>
);

const SkeletonStats = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="card p-6 space-y-4">
        <Skeleton variant="text" className="w-1/2" />
        <Skeleton variant="title" className="w-3/4 h-8" />
        <Skeleton variant="text" className="w-1/3" />
      </div>
    ))}
  </div>
);

export { Skeleton, SkeletonCard, SkeletonTable, SkeletonStats };
export default Skeleton;
