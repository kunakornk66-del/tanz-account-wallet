import React, { useMemo, useState } from 'react';
import { Transaction } from '../types';
import { getCategoryDetails } from '../themes';
import { jsPDF } from 'jspdf';
import { Download, FileSpreadsheet, FileText, Calendar, Wallet, TrendingDown, Sparkles } from 'lucide-react';

// Helper to fetch custom TTF fonts and convert them to base64 for jsPDF
const fetchFontAsBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download font: ${response.status}`);
  }
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64 = base64String.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
};

interface ExportPanelProps {
  transactions: Transaction[];
  isDark: boolean;
  selectedMonth: string; // YYYY-MM
  primaryBtnClass: string;
  addToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  transactions,
  isDark,
  selectedMonth,
  primaryBtnClass,
  addToast
}) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Filter transactions for chosen month
  const monthlyTx = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  const monthSummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    monthlyTx.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });
    return {
      income,
      expense,
      balance: income - expense,
      savingsRate: income > 0 ? Math.round(((income - expense) / income) * 100) : 0
    };
  }, [monthlyTx]);

  // Translate month string (e.g., "2026-07") to Thai month label
  const formattedMonthLabel = useMemo(() => {
    const [year, monthStr] = selectedMonth.split('-');
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const monthIndex = parseInt(monthStr) - 1;
    return `${thaiMonths[monthIndex]} ${parseInt(year) + 543}`; // Convert to Buddhist Era
  }, [selectedMonth]);

  // --- 1. Export as Excel / CSV (with UTF-8 BOM so Excel opens with Thai font perfectly) ---
  const exportToExcel = () => {
    if (monthlyTx.length === 0) {
      if (addToast) {
        addToast('ไม่มีข้อมูลบัญชีในเดือนนี้สำหรับส่งออก 🥺', 'error');
      } else {
        alert('ไม่มีข้อมูลบัญชีในเดือนนี้สำหรับส่งออก');
      }
      return;
    }

    // CSV header in Thai
    const headers = ['วันที่', 'เวลา', 'ประเภท', 'หมวดหมู่', 'รายละเอียดบันทึก', 'จำนวนเงิน (บาท)'];
    
    const rows = monthlyTx.map(t => {
      const typeLabel = t.type === 'income' ? 'รายรับ' : 'รายจ่าย';
      const catDetail = getCategoryDetails(t.category, t.type);
      return [
        t.date,
        t.time,
        typeLabel,
        catDetail.name,
        t.description.replace(/,/g, ' '), // replace commas to prevent CSV issues
        t.amount.toFixed(2)
      ];
    });

    // Create CSV content starting with UTF-8 BOM (\uFEFF)
    let csvContent = '\uFEFF';
    csvContent += headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Kuma_Finance_Report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- 2. Export as PDF (clean, professional with vector layouts and perfect Thai fonts) ---
  const exportToPDF = async () => {
    if (monthlyTx.length === 0) {
      if (addToast) {
        addToast('ไม่มีข้อมูลบัญชีในเดือนนี้สำหรับส่งออก 🥺', 'error');
      } else {
        alert('ไม่มีข้อมูลบัญชีในเดือนนี้สำหรับส่งออก');
      }
      return;
    }

    setIsGeneratingPDF(true);
    if (addToast) {
      addToast('กำลังเตรียมฟอนต์ภาษาไทยและสร้างรายงาน... 🧸📄', 'info');
    }

    try {
      const doc = new jsPDF();
      
      let hasThaiFont = false;
      try {
        // Fetch Sarabun Regular & Bold fonts dynamically
        const [regularBase64, boldBase64] = await Promise.all([
          fetchFontAsBase64('https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Regular.ttf'),
          fetchFontAsBase64('https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Bold.ttf')
        ]);
        
        doc.addFileToVFS('Sarabun-Regular.ttf', regularBase64);
        doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
        
        doc.addFileToVFS('Sarabun-Bold.ttf', boldBase64);
        doc.addFont('Sarabun-Bold.ttf', 'Sarabun', 'bold');
        
        doc.setFont('Sarabun', 'normal');
        hasThaiFont = true;
      } catch (fontError) {
        console.error('Failed to load Thai font, falling back to Helvetica:', fontError);
        doc.setFont('Helvetica', 'normal');
        if (addToast) {
          addToast('เกิดข้อผิดพลาดในการโหลดฟอนต์ภาษาไทย ระบบจะใช้แบบอักษรสำรองแทนครับ 🥺', 'error');
        }
      }

      const fontNormal = hasThaiFont ? 'Sarabun' : 'Helvetica';
      const fontBold = hasThaiFont ? 'Sarabun' : 'Helvetica';

      // Header Banner
      doc.setFillColor(254, 242, 244); // light pink rose-50
      doc.rect(0, 0, 220, 45, 'F');
      
      // Title
      doc.setTextColor(225, 29, 72); // rose-600
      doc.setFont(fontBold, 'bold');
      doc.setFontSize(22);
      doc.text('รายงานสรุปยอดบัญชี KUMA KA-CHING 🧸', 15, 20);
      
      doc.setTextColor(100, 116, 139); // slate-500
      doc.setFont(fontNormal, 'normal');
      doc.setFontSize(10);
      doc.text(`รายการเดินบัญชีรายเดือน: ประจำเดือน ${formattedMonthLabel} (${selectedMonth})`, 15, 28);
      doc.text(`วันที่ออกรายงาน: ${new Date().toLocaleString('th-TH')}`, 15, 34);
      
      // Summary Cards (Draw 3 elegant cards for Income, Expense, Balance)
      // Card 1: Income
      doc.setFillColor(240, 253, 250); // emerald-50
      doc.rect(15, 52, 55, 30, 'F');
      doc.setDrawColor(209, 250, 229);
      doc.rect(15, 52, 55, 30, 'D');
      doc.setTextColor(5, 150, 105); // emerald-600
      doc.setFont(fontBold, 'bold');
      doc.setFontSize(10);
      doc.text('รายรับรวมทั้งหมด', 18, 59);
      doc.setFontSize(14);
      doc.text(`฿ ${monthSummary.income.toLocaleString(undefined, {minimumFractionDigits: 2})}`, 18, 72);

      // Card 2: Expense
      doc.setFillColor(254, 242, 242); // rose-50
      doc.rect(78, 52, 55, 30, 'F');
      doc.setDrawColor(254, 226, 226);
      doc.rect(78, 52, 55, 30, 'D');
      doc.setTextColor(220, 38, 38); // rose-600
      doc.setFont(fontBold, 'bold');
      doc.setFontSize(10);
      doc.text('รายจ่ายรวมทั้งหมด', 81, 59);
      doc.setFontSize(14);
      doc.text(`฿ ${monthSummary.expense.toLocaleString(undefined, {minimumFractionDigits: 2})}`, 81, 72);

      // Card 3: Net Balance
      const isPositive = monthSummary.balance >= 0;
      if (isPositive) {
        doc.setFillColor(239, 246, 255); // blue-50
        doc.setDrawColor(219, 234, 254);
        doc.setTextColor(37, 99, 235); // blue-600
      } else {
        doc.setFillColor(254, 244, 244); // rose-50
        doc.setDrawColor(254, 226, 226);
        doc.setTextColor(220, 38, 38); // rose-600
      }
      doc.rect(140, 52, 55, 30, 'F');
      doc.rect(140, 52, 55, 30, 'D');
      doc.setFont(fontBold, 'bold');
      doc.setFontSize(10);
      doc.text('เงินคงเหลือสุทธิ', 143, 59);
      doc.setFontSize(14);
      doc.text(`฿ ${monthSummary.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}`, 143, 72);

      // Savings rate line
      doc.setTextColor(115, 115, 115);
      doc.setFont(fontNormal, 'normal');
      doc.setFontSize(9.5);
      doc.text(`อัตราการออมสะสม: ${monthSummary.savingsRate}% ของรายรับรวมประจำเดือนทั้งหมด เก่งมากเลยน้าค้าบ!`, 15, 91);

      // Transaction Details Table Header
      doc.setFillColor(71, 85, 105); // slate-600
      doc.rect(15, 98, 180, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(fontBold, 'bold');
      doc.setFontSize(10);
      doc.text('วันที่ / เวลา', 18, 103.5);
      doc.text('ประเภท', 42, 103.5);
      doc.text('หมวดหมู่', 65, 103.5);
      doc.text('รายละเอียด / บันทึกโน้ต', 110, 103.5);
      doc.text('จำนวนเงิน (บาท)', 168, 103.5);

      // Table rows
      let currentY = 112;
      doc.setFont(fontNormal, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);

      // Order transactions chronologically for the PDF report
      const sortedTx = [...monthlyTx].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

      sortedTx.forEach((t, i) => {
        // Check if we exceed page height
        if (currentY > 275) {
          doc.addPage();
          currentY = 20;
          // Draw miniature header on new page
          doc.setFillColor(71, 85, 105);
          doc.rect(15, currentY, 180, 8, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont(fontBold, 'bold');
          doc.setFontSize(10);
          doc.text('วันที่ / เวลา', 18, currentY + 5.5);
          doc.text('ประเภท', 42, currentY + 5.5);
          doc.text('หมวดหมู่', 65, currentY + 5.5);
          doc.text('รายละเอียด / บันทึกโน้ต', 110, currentY + 5.5);
          doc.text('จำนวนเงิน (บาท)', 168, currentY + 5.5);
          doc.setFont(fontNormal, 'normal');
          doc.setFontSize(9);
          doc.setTextColor(51, 65, 85);
          currentY += 13;
        }

        // Zebra striping background
        if (i % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, currentY - 4, 180, 6.5, 'F');
        }

        const typeLabel = t.type === 'income' ? 'รายรับ (+)' : 'รายจ่าย (-)';
        const catDetail = getCategoryDetails(t.category, t.type);
        
        // Format date and time
        const formattedDateTime = `${t.date} ${t.time || ''}`;
        
        // Print row
        doc.text(formattedDateTime, 18, currentY);
        
        if (t.type === 'income') {
          doc.setTextColor(16, 185, 129); // emerald-500
        } else {
          doc.setTextColor(239, 68, 68); // rose-500
        }
        doc.text(typeLabel, 42, currentY);
        doc.setTextColor(51, 65, 85);

        // Print category emoji + name
        const catLabel = `${catDetail.emoji} ${catDetail.name}`;
        doc.text(catLabel, 65, currentY);

        // Truncate description if too long
        const desc = t.description 
          ? (t.description.length > 30 ? t.description.slice(0, 28) + '...' : t.description)
          : '-';
        doc.text(desc, 110, currentY);

        // Amount with bold type
        doc.setFont(fontBold, 'bold');
        if (t.type === 'income') {
          doc.setTextColor(16, 185, 129);
          doc.text(`+${t.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}`, 168, currentY);
        } else {
          doc.setTextColor(239, 68, 68);
          doc.text(`-${t.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}`, 168, currentY);
        }
        doc.setFont(fontNormal, 'normal');
        doc.setTextColor(51, 65, 85);

        currentY += 7;
      });

      // Draw Footer Accent
      doc.setFillColor(241, 245, 249);
      doc.rect(0, 287, 220, 10, 'F');
      doc.setFont(fontNormal, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Kuma Ka-Ching Account Planner - ส่งออกข้อมูลสรุปการเงินน่ารักๆ โดยคุมะคุง 🧸', 15, 292);

      doc.save(`Kuma_Finance_Report_${selectedMonth}.pdf`);
      
      if (addToast) {
        addToast('ส่งออกรายงาน PDF สำเร็จเรียบร้อยแล้วครับ! 🧸📄✨', 'success');
      }
    } catch (e) {
      console.error(e);
      if (addToast) {
        addToast('เกิดข้อผิดพลาดในการดาวน์โหลด PDF 🥺', 'error');
      }
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className={`p-4 rounded-3xl border transition-all ${
      isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100 shadow-sm'
    }`}>
      {/* Title */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-2 rounded-xl ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-50 text-rose-500'}`}>
          <Download size={16} />
        </div>
        <div>
          <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            ส่งออกข้อมูลรายเดือน
          </h3>
          <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
            สรุปยอดประจำเดือนและพิมพ์เอกสาร
          </p>
        </div>
      </div>

      {/* Month Card Summary Preview */}
      <div className={`p-3.5 rounded-2xl border mb-4 relative overflow-hidden ${
        isDark ? 'bg-slate-950 border-slate-800' : 'bg-rose-50/20 border-rose-100/50'
      }`}>
        {/* Decorative background element */}
        <div className="absolute right-[-10px] bottom-[-10px] opacity-10 text-6xl">🧸</div>

        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-rose-600 dark:text-amber-400 flex items-center gap-1">
            <Sparkles size={12} className="animate-spin-slow" /> สรุปยอดเดือน {formattedMonthLabel}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            isDark ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-500 shadow-sm'
          }`}>
            ทั้งหมด {monthlyTx.length} รายการ
          </span>
        </div>

        {/* Small grid of metrics */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex flex-col">
            <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>รายรับรวม</span>
            <span className="font-bold text-emerald-500">฿{monthSummary.income.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>
          <div className="flex flex-col">
            <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>รายจ่ายรวม</span>
            <span className="font-bold text-rose-500">฿{monthSummary.expense.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>
          <div className="col-span-2 pt-1 border-t border-dashed border-slate-200 dark:border-slate-800 flex justify-between items-center mt-1">
            <div>
              <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>เงินคงเหลือ</span>
              <p className={`font-bold ${monthSummary.balance >= 0 ? 'text-sky-500' : 'text-rose-500'}`}>
                ฿{monthSummary.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}
              </p>
            </div>
            <div className="text-right">
              <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>อัตราการออม</span>
              <p className="font-bold text-amber-500">{monthSummary.savingsRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Export Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={exportToExcel}
          disabled={isGeneratingPDF}
          className={`flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl text-xs font-bold transition-all border ${
            isGeneratingPDF ? 'opacity-50 cursor-not-allowed' : ''
          } ${
            isDark 
              ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-emerald-400' 
              : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100'
          }`}
        >
          <FileSpreadsheet size={15} />
          <span>Excel (CSV)</span>
        </button>

        <button
          onClick={exportToPDF}
          disabled={isGeneratingPDF}
          className={`flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl text-xs font-bold transition-all border ${
            isGeneratingPDF ? 'opacity-50 cursor-not-allowed' : ''
          } ${
            isDark 
              ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-rose-400' 
              : 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100'
          }`}
        >
          <FileText size={15} className={isGeneratingPDF ? 'animate-spin' : ''} />
          <span>{isGeneratingPDF ? 'กำลังสร้าง...' : 'รายงาน PDF'}</span>
        </button>
      </div>
    </div>
  );
};
