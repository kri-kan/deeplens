// @ts-nocheck
import React from 'react';

export const FixedSizeList = ({ height, itemCount, itemSize, width, children: Row }: any) => {
    const renderCount = Math.min(itemCount, 500); // 500 items is manageable
    const totalHeight = itemCount * itemSize;

    return (
        <div style= {{ height, width, overflowY: 'auto' }
}>
    <div style={ { height: totalHeight, position: 'relative' } }>
    {
        Array.from({ length: renderCount }).map((_, index) => (
            <div key= { index } style = {{ position: 'absolute', top: index * itemSize, height: itemSize, width: '100%' }} >
        <Row index={ index } style = {{ height: '100%', width: '100%' }} />
            </div>
                ))}
{
    itemCount > renderCount && (
        <div style={ { position: 'absolute', top: renderCount * itemSize, width: '100%', textAlign: 'center', padding: '10px', color: '#888' } }>
            Display limited to first { renderCount } chats.Use search to find others.
                    </div>
                )
}
</div>
    </div>
    );
};
