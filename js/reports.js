// reports.js - Reports & Charts
class ReportManager {
    static async init() {
        console.log('📊 ReportManager init');
        await this.loadStats();
        this.drawCharts();
        document.getElementById('btn-export-excel')?.addEventListener('click', () => {
            if (typeof BackupManager !== 'undefined') {
                BackupManager.exportSalesToExcel('2024-01-01', new Date().toISOString().split('T')[0]);
            }
        });
        document.getElementById('btn-print-report')?.addEventListener('click', () => window.print());
    }

    static async loadStats() {
        const orders = await DB.getAll('orders');
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const weekAgo = new Date(now.getTime() - 7*24*60*60*1000).toISOString();
        const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        document.getElementById('today-sales').textContent = UI.formatCurrency(orders.filter(o => o.createdAt >= today).reduce((s,o) => s+o.finalAmount, 0));
        document.getElementById('week-sales').textContent = UI.formatCurrency(orders.filter(o => o.createdAt >= weekAgo).reduce((s,o) => s+o.finalAmount, 0));
        document.getElementById('month-sales').textContent = UI.formatCurrency(orders.filter(o => o.createdAt >= monthAgo).reduce((s,o) => s+o.finalAmount, 0));
        document.getElementById('total-orders').textContent = orders.length;
    }

    static drawCharts() {
        this._drawBar('chart-weekly', ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'], [12,19,15,21,18,25,30], 'هزار تومان');
        this._drawBar('chart-monthly', ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور'], [50,62,58,71,69,75], 'هزار تومان');
        this._drawBar('chart-products', ['لاته','اسپرسو','کاپوچینو','موکا','چای'], [45,38,32,28,20], 'عدد');
    }

    static _drawBar(canvasId, labels, data, unit) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.parentElement.clientWidth - 48;
        const h = 260;
        canvas.width = w;
        canvas.height = h;
        
        const pad = { top: 10, right: 10, bottom: 35, left: 10 };
        const cw = w - pad.left - pad.right;
        const ch = h - pad.top - pad.bottom;
        const max = Math.max(...data) * 1.2;
        
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#fff';
        ctx.fillRect(0, 0, w, h);
        
        // Grid
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 4; i++) {
            const y = pad.top + (ch/4)*i;
            ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w-pad.right, y); ctx.stroke();
            ctx.fillStyle = '#888'; ctx.font = '10px Inter'; ctx.textAlign = 'right';
            ctx.fillText(Math.round(max-(max/4)*i) + unit, pad.left-4, y+4);
        }
        
        // Bars
        const barW = (cw/data.length)*0.6;
        data.forEach((val, i) => {
            const x = pad.left + (cw/data.length)*i + (cw/data.length-barW)/2;
            const bh = (val/max)*ch;
            const y = h - pad.bottom - bh;
            const grad = ctx.createLinearGradient(x, y, x, h-pad.bottom);
            grad.addColorStop(0, '#8B4513'); grad.addColorStop(1, '#D2691E');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.roundRect(x, y, barW, bh, [4,4,0,0]); ctx.fill();
            ctx.fillStyle = '#333'; ctx.font = '11px Inter'; ctx.textAlign = 'center';
            ctx.fillText(val, x+barW/2, y-6);
        });
        
        // Labels
        data.forEach((_, i) => {
            const x = pad.left + (cw/data.length)*i + (cw/data.length)/2;
            ctx.fillStyle = '#666'; ctx.font = '11px Inter'; ctx.textAlign = 'center';
            ctx.fillText(labels[i], x, h-8);
        });
    }
}