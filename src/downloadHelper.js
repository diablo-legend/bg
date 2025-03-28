import html2canvas from 'html2canvas';

const downloadCanvas = (canvas, fileName) => {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = canvas.toDataURL('image/png');
    link.click();
};

export const downloadProductCard = async (productId) => {
    // Находим карточку товара
    const card = document.querySelector(`[data-card-id="${productId}"]`);
    if (!card) return;

    // Сохраняем оригинальные размеры графика
    const chartWrapper = card.querySelector('.chart-wrapper');
    const originalHeight = chartWrapper.style.height;
    
    // Временно увеличиваем размер для лучшего качества
    chartWrapper.style.height = '400px';

    // Обновляем размер графика
    const chart = window.productCharts.get(productId);
    if (chart) {
        chart.resize();
    }

    // Настройки для высокого качества
    const scale = 2;
    const options = {
        scale: scale,
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: card.scrollWidth * scale,
        windowHeight: card.scrollHeight * scale
    };

    try {
        // Создаем canvas для всей карточки
        const cardCanvas = await html2canvas(card, options);
        downloadCanvas(cardCanvas, `product-card-${productId}.png`);

        // Создаем canvas только для графика
        const chartCanvas = await html2canvas(chartWrapper, options);
        downloadCanvas(chartCanvas, `product-chart-${productId}.png`);
    } catch (error) {
        console.error('Error generating images:', error);
    } finally {
        // Возвращаем оригинальные размеры
        chartWrapper.style.height = originalHeight;
        if (chart) {
            chart.resize();
        }
    }
};