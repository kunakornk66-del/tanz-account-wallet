import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { CategoryInfo } from '../themes';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { Calendar, ChartPie, TrendingUp } from 'lucide-react';

interface FinancialChartsProps {
  transactions: Transaction[];
  isDark: boolean;
  selectedMonth: string; // YYYY-MM
  incomeCategories: CategoryInfo[];
  expenseCategories: CategoryInfo[];
}

export const FinancialCharts: React.FC<FinancialChartsProps> = ({
  transactions,
  isDark,
  selectedMonth,
  incomeCategories,
  expenseCategories
}) => {
  const [pieType, setPieType] = useState<'expense' | 'income'>('expense');
  const [chartRange, setChartRange] = useState<'7days' | 'month'>('7days');

  // Filter transactions for selected month
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // --- Process data for Daily Spending (Bar Chart) ---
  const dailyData = useMemo(() => {
    // If range is '7days', get the last 7 days with transactions or from today
    if (chartRange === '7days') {
      const result: { dateLabel: string; income: number; expense: number }[] = [];
      const today = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        
        // Sum transactions for this day
        let inc = 0;
        let exp = 0;
        transactions.forEach(t => {
          if (t.date === dateStr) {
            if (t.type === 'income') inc += t.amount;
            else exp += t.amount;
          }
        });

        // Date label (dd/mm format)
        const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const label = `${parseInt(dd)} ${thaiMonthsShort[d.getMonth()]}`;

        result.push({
          dateLabel: label,
          income: inc,
          expense: exp
        });
      }
      return result;
    } else {
      // Monthly summary by days (1st to end of month)
      const year = parseInt(selectedMonth.split('-')[0]);
      const month = parseInt(selectedMonth.split('-')[1]) - 1;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const result = [];

      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${selectedMonth}-${String(i).padStart(2, '0')}`;
        let inc = 0;
        let exp = 0;

        transactions.forEach(t => {
          if (t.date === dateStr) {
            if (t.type === 'income') inc += t.amount;
            else exp += t.amount;
          }
        });

        // Skip days with 0 for cleaner monthly view if needed, but for bar chart
        // we can group them into chunks or show days. To keep graph beautiful, 
        // we only display days that actually have transactions or show every 5 days.
        result.push({
          dayNum: i,
          dateLabel: `${i} มี.ค.`, // dynamic month name in real code
          income: inc,
          expense: exp
        });
      }

      // Format monthly labels nicely
      const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      return result.map(item => ({
        ...item,
        dateLabel: `${item.dayNum} ${thaiMonths[month]}`
      })).filter(item => item.income > 0 || item.expense > 0); // Only show days with data to make bar chart cute!
    }
  }, [transactions, selectedMonth, chartRange]);

  // --- Process data for Category Summary (Pie Chart) ---
  const categoryPieData = useMemo(() => {
    const categoryTotals: { [key: string]: number } = {};
    
    // Filter active type
    const activeTx = filteredTransactions.filter(t => t.type === pieType);
    
    activeTx.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    const cats = pieType === 'income' ? incomeCategories : expenseCategories;

    const data = Object.keys(categoryTotals).map(catId => {
      const info = cats.find(c => c.id === catId) || {
        name: catId === 'others' ? 'อื่นๆ' : catId,
        emoji: '🧸'
      };
      return {
        name: `${info.emoji} ${info.name}`,
        value: categoryTotals[catId],
        color: pieType === 'expense' 
          ? getExpenseCategoryColor(catId) 
          : getIncomeCategoryColor(catId)
      };
    });

    return data.sort((a, b) => b.value - a.value);
  }, [filteredTransactions, pieType, incomeCategories, expenseCategories]);

  // --- Process data for Sub-category breakdown / insights ---
  const subCategorySummary = useMemo(() => {
    const subTotals: { [key: string]: { amount: number, mainId: string } } = {};
    
    filteredTransactions.forEach(t => {
      if (t.subCategory && t.type === pieType) {
        const key = `${t.category}:${t.subCategory}`;
        if (!subTotals[key]) {
          subTotals[key] = { amount: 0, mainId: t.category };
        }
        subTotals[key].amount += t.amount;
      }
    });

    const list = Object.keys(subTotals).map(key => {
      const [mainId, subName] = key.split(':');
      const cats = pieType === 'income' ? incomeCategories : expenseCategories;
      const mainCat = cats.find(c => c.id === mainId) || { name: mainId === 'others' ? 'อื่นๆ' : mainId, emoji: '📁' };
      
      return {
        key,
        mainName: mainCat.name,
        mainEmoji: mainCat.emoji,
        subName,
        amount: subTotals[key].amount
      };
    });

    // Sort descending by amount
    return list.sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, pieType, incomeCategories, expenseCategories]);

  // Helper colors for Recharts pie cells
  function getExpenseCategoryColor(catId: string) {
    const colors: { [key: string]: string } = {
      food: '#FB923C', // orange-400
      travel: '#38BDF8', // sky-400
      shopping: '#FB7185', // rose-400
      bills: '#FBBF24', // amber-400
      entertainment: '#C084FC', // purple-400
      health: '#2DD4BF', // teal-400
      others: '#94A3B8' // slate-400
    };
    return colors[catId] || '#94A3B8';
  }

  function getIncomeCategoryColor(catId: string) {
    const colors: { [key: string]: string } = {
      salary: '#34D399', // emerald-400
      freelance: '#22D3EE', // cyan-400
      investment: '#818CF8', // indigo-400
      allowance: '#F472B6', // pink-400
      others: '#FBBF24' // amber-400
    };
    return colors[catId] || '#FBBF24';
  }

  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded-2xl border shadow-lg text-xs font-semibold ${
          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
        }`}>
          <p className="mb-1 text-slate-400 font-medium">{payload[0].payload.dateLabel || payload[0].name}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="flex items-center gap-1.5" style={{ color: entry.color || entry.fill }}>
              <span>{entry.name === 'income' || entry.name === 'รายรับ' ? '💰' : '💸'}</span>
              <span>{entry.name === 'income' ? 'รายรับ' : entry.name === 'expense' ? 'รายจ่าย' : entry.name}:</span>
              <span className="font-bold">฿{entry.value.toLocaleString()}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Daily Summary Bar Chart Card */}
      <div className={`p-4 rounded-3xl border transition-all ${
        isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100 shadow-sm'
      }`}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-50 text-rose-500'}`}>
              <TrendingUp size={16} />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                สถิติรายวัน
              </h3>
              <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                วิเคราะห์แนวโน้มการเงินของคุณ
              </p>
            </div>
          </div>

          {/* Range Selector */}
          <div className={`p-0.5 rounded-xl flex text-xs font-semibold ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <button
              onClick={() => setChartRange('7days')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                chartRange === '7days'
                  ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-400 hover:text-slate-600 dark:text-slate-400'
              }`}
            >
              7 วันล่าสุด
            </button>
            <button
              onClick={() => setChartRange('month')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                chartRange === 'month'
                  ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-400 hover:text-slate-600 dark:text-slate-400'
              }`}
            >
              เดือนนี้
            </button>
          </div>
        </div>

        {/* Bar Chart Container */}
        <div className="h-[200px] w-full">
          {dailyData.length === 0 || (dailyData.every(d => d.income === 0 && d.expense === 0)) ? (
            <div className="h-full flex flex-col justify-center items-center text-center text-slate-400 text-xs">
              <span>📊</span>
              <p className="mt-1">ยังไม่มีบันทึกข้อมูลของช่วงเวลานี้</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <XAxis 
                  dataKey="dateLabel" 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 10, fontWeight: 500 }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 10 }}
                />
                <Tooltip content={customTooltip} cursor={{ fill: isDark ? '#334155' : '#F8FAFC', radius: 8 }} />
                <Bar dataKey="income" name="income" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={15} />
                <Bar dataKey="expense" name="expense" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={15} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        
        {/* Legends indicator */}
        <div className="flex justify-center items-center gap-4 mt-2 text-[10px] font-bold">
          <div className="flex items-center gap-1 text-emerald-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> รายรับ (Income)
          </div>
          <div className="flex items-center gap-1 text-rose-500">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> รายจ่าย (Expense)
          </div>
        </div>
      </div>

      {/* Category Pie Chart Card */}
      <div className={`p-4 rounded-3xl border transition-all ${
        isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100 shadow-sm'
      }`}>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-50 text-rose-500'}`}>
              <ChartPie size={16} />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                หมวดหมู่ยอดนิยม
              </h3>
              <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                สัดส่วนการใช้เงินแยกรายกลุ่ม
              </p>
            </div>
          </div>

          {/* Income/Expense Toggle */}
          <div className={`p-0.5 rounded-xl flex text-xs font-semibold ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <button
              onClick={() => setPieType('expense')}
              className={`px-2 py-1 rounded-lg transition-all ${
                pieType === 'expense'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-400 dark:text-slate-400'
              }`}
            >
              รายจ่าย 💸
            </button>
            <button
              onClick={() => setPieType('income')}
              className={`px-2 py-1 rounded-lg transition-all ${
                pieType === 'income'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-400 dark:text-slate-400'
              }`}
            >
              รายรับ 💰
            </button>
          </div>
        </div>

        {/* Pie/Donut Chart */}
        <div className="h-[180px] w-full flex items-center justify-center">
          {categoryPieData.length === 0 ? (
            <div className="flex flex-col justify-center items-center text-center text-slate-400 text-xs">
              <span>🍩</span>
              <p className="mt-1">ยังไม่มีข้อมูลของประเภทนี้</p>
            </div>
          ) : (
            <div className="flex w-full h-full items-center">
              {/* Pie */}
              <div className="w-[55%] h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={customTooltip} />
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legends details */}
              <div className="w-[45%] flex flex-col justify-center gap-1.5 max-h-[160px] overflow-y-auto no-scrollbar pr-1">
                {categoryPieData.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between text-[10px] font-bold">
                    <div className="flex items-center gap-1 truncate max-w-[80%]">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className={`truncate ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{entry.name}</span>
                    </div>
                    <span className={`${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                      {entry.value.toLocaleString()}฿
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subcategory Insights Leaderboard Card */}
      <div className={`p-4 rounded-3xl border transition-all ${
        isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100 shadow-sm'
      }`}>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl bg-amber-500/10 text-amber-500`}>
              <span>👑</span>
            </div>
            <div>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                เจาะลึกผู้เกี่ยวข้อง / หมวดย่อย
              </h3>
              <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                อันดับการจ่ายของหมวดย่อย ({pieType === 'expense' ? 'รายจ่าย' : 'รายรับ'})
              </p>
            </div>
          </div>
        </div>

        {subCategorySummary.length === 0 ? (
          <div className="p-6 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
            <span className="text-2xl select-none">🧸🧁</span>
            <p className="text-[10px] text-slate-400 font-bold mt-1.5 leading-relaxed">
              ยังไม่มีข้อมูลหมวดย่อยในเดือนนี้ครับ<br />
              เมื่อคุณจดรายการและเลือกหมวดย่อย เช่น "พ่อ", "แม่" หรือ "ลูก"<br />
              ข้อมูลจัดอันดับและสถิติจะแสดงขึ้นที่นี่ทันทีเลยน้า!
            </p>
          </div>
        ) : (
          <div className="space-y-3 mt-1">
            {subCategorySummary.map((item, index) => {
              // Calculate width percentage relative to the highest amount
              const maxAmount = subCategorySummary[0].amount;
              const percent = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
              
              return (
                <div key={item.key} className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {/* Rank indicators */}
                      <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-lg text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {index === 0 ? '👑' : `#${index + 1}`}
                      </span>
                      <span className="text-slate-400 shrink-0 text-[10px]">{item.mainEmoji} {item.mainName} •</span>
                      <span className={`truncate font-extrabold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        {item.subName}
                      </span>
                    </div>
                    <span className={`${isDark ? 'text-slate-200' : 'text-slate-800'} font-extrabold shrink-0`}>
                      ฿{item.amount.toLocaleString()}
                    </span>
                  </div>
                  {/* Custom progress bar */}
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        pieType === 'expense'
                          ? index === 0 ? 'bg-rose-500' : 'bg-rose-400/70'
                          : index === 0 ? 'bg-emerald-500' : 'bg-emerald-400/70'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
