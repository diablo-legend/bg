import html2canvas from 'html2canvas';

const downloadCanvas = (canvas, fileName) => {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = canvas.toDataURL('image/png', 1.0);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const downloadProductCard = async (productId, type = 'card') => {
    const card = document.querySelector(`[data-card-id="${productId}"]`);
    if (!card) return;

    // Get the original chart canvas
    const originalChartCanvas = card.querySelector('.chart-wrapper canvas');
    const chart = window.productCharts.get(productId);
    
    if (!originalChartCanvas || !chart) {
        console.error('Chart not found');
        return;
    }

    // Create a temporary container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = card.offsetWidth + 'px';
    container.style.backgroundColor = '#FFFFFF';
    
    // Clone the card
    const cardClone = card.cloneNode(true);
    container.appendChild(cardClone);
    document.body.appendChild(container);

    try {
        const chartWrapper = cardClone.querySelector('.chart-wrapper');
        if (chartWrapper) {
            // Set fixed dimensions for better quality
            chartWrapper.style.height = '400px';
            chartWrapper.style.width = '100%';
            chartWrapper.style.backgroundColor = '#F9FAFB';
            chartWrapper.style.padding = '1rem';
            chartWrapper.style.margin = '1.5rem 0';
            chartWrapper.style.borderRadius = '0.5rem';
            
            // Create a new canvas for the chart
            const newCanvas = document.createElement('canvas');
            newCanvas.width = originalChartCanvas.width;
            newCanvas.height = originalChartCanvas.height;
            
            // Copy the chart content
            const ctx = newCanvas.getContext('2d');
            ctx.drawImage(originalChartCanvas, 0, 0);
            
            // Replace the old canvas with the new one
            const oldCanvas = chartWrapper.querySelector('canvas');
            if (oldCanvas) {
                chartWrapper.replaceChild(newCanvas, oldCanvas);
            }
        }

        // Remove unnecessary elements
        const deleteButton = cardClone.querySelector('.delete-product');
        if (deleteButton) deleteButton.remove();
        const downloadButtons = cardClone.querySelector('.download-buttons');
        if (downloadButtons) downloadButtons.remove();

        // Copy computed styles
        const copyComputedStyles = (source, target) => {
            const styles = window.getComputedStyle(source);
            Array.from(styles).forEach(key => {
                target.style.setProperty(key, styles.getPropertyValue(key), styles.getPropertyPriority(key));
            });

            // Copy styles for children
            Array.from(source.children).forEach((child, index) => {
                if (target.children[index]) {
                    copyComputedStyles(child, target.children[index]);
                }
            });
        };

        copyComputedStyles(card, cardClone);

        // Wait for styles to be applied
        await new Promise(resolve => setTimeout(resolve, 100));

        // Configure html2canvas options
        const options = {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#FFFFFF',
            logging: false,
            width: card.offsetWidth,
            height: type === 'chart' ? 400 : cardClone.offsetHeight,
            onclone: (clonedDoc) => {
                const clonedElement = clonedDoc.querySelector(`[data-card-id="${productId}"]`);
                if (clonedElement) {
                    clonedElement.style.transform = 'none';
                    clonedElement.style.transition = 'none';
                    clonedElement.style.boxShadow = 'none';
                }
            }
        };

        // Generate and download the image
        if (type === 'chart' && chartWrapper) {
            const canvas = await html2canvas(chartWrapper, options);
            downloadCanvas(canvas, `product-chart-${productId}.png`);
        } else {
            const canvas = await html2canvas(cardClone, options);
            downloadCanvas(canvas, `product-card-${productId}.png`);
        }

    } catch (error) {
        console.error('Error generating image:', error);
    } finally {
        // Cleanup
        container.remove();
    }
};