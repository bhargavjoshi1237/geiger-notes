export const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
};

export const sanitizeNodes = (nodes) => {
    return nodes.map(node => ({
        ...node,
        selected: false,
        data: {
            ...node.data,
            outline: undefined
        }
    }));
};

export const sanitizeEdges = (edges) => {
    return edges.map(edge => ({
        ...edge,
        selected: false
    }));
};

export const getRole = (currentUser, data) => {
    if (!currentUser || !data) return 'viewer';
    if (data.host === currentUser.id) return 'host';
    
    const joiners = data.joiners || {};
    const myStatus = joiners[currentUser.id];
    
    if (myStatus && myStatus.status === 'joined') {
        return 'editor';
    } else if (myStatus && myStatus.status === 'requested') {
        return 'pending';
    }
    
    return 'viewer';
};
