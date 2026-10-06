import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowLeft,
  Bell,
  Box,
  Check,
  ChevronDown,
  CircleUserRound,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  Link2,
  MapPin,
  Menu,
  MoreHorizontal,
  PackageCheck,
  Pill,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Store,
  Truck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import "./styles.css";

type OrderStatus = "جديد" | "قيد التجهيز" | "مع الكابتن" | "تم التسليم";
type Order = { id: string; customer: string; area: string; total: string; status: OrderStatus; time: string; captain: string };

type Captain = { name: string; phone: string; area: string; status: "متاح" | "في مهمة" | "غير متصل"; orders: number; rating: string };
type ApiCaptain = { id: number; name: string | null; phone: string | null; availability: "available" | "busy" | "offline" };

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "https://3000-iydxbea3oqx9cazcng396-b30a46c3.us4.manus.computer").replace(/\/$/, "");
const statusToArabic: Record<string, OrderStatus> = { new: "جديد", preparing: "قيد التجهيز", ready: "قيد التجهيز", assigned: "مع الكابتن", in_transit: "مع الكابتن", delivered: "تم التسليم", cancelled: "تم التسليم" };

async function callTrpc(path: string, input?: unknown) {
  const url = `${API_BASE_URL}/api/trpc/${path}`;
  const response = await fetch(input === undefined ? url : `${url}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`, { credentials: "include" });
  const payload = await response.json();
  const result = Array.isArray(payload) ? payload[0] : payload;
  if (!response.ok || result?.error) throw new Error(result?.error?.json?.message ?? "API request failed");
  return result?.result?.data?.json ?? result?.result?.data;
}

function mapApiOrder(order: { id: string; customerName: string; deliveryAddress: string; total: string; status: string; createdAt: string | Date; captainId: number | null }): Order {
  return { id: order.id, customer: order.customerName, area: order.deliveryAddress, total: `${order.total} ر.س`, status: statusToArabic[order.status] ?? "جديد", time: new Date(order.createdAt).toLocaleTimeString("ar-SA", { hour: "numeric", minute: "2-digit" }), captain: order.captainId ? `كابتن #${order.captainId}` : "غير معيّن" };
}

const initialOrders: Order[] = [
  { id: "#PH-2048", customer: "أحمد سالم", area: "حي النخيل", total: "128.50 ر.س", status: "جديد", time: "منذ 4 دقائق", captain: "غير معيّن" },
  { id: "#PH-2047", customer: "سارة محمد", area: "شارع الجامعة", total: "74.00 ر.س", status: "مع الكابتن", time: "منذ 12 دقيقة", captain: "خالد العتيبي" },
  { id: "#PH-2046", customer: "مريم عبدالله", area: "حي الزهراء", total: "219.75 ر.س", status: "قيد التجهيز", time: "منذ 22 دقيقة", captain: "غير معيّن" },
  { id: "#PH-2045", customer: "يوسف علي", area: "حي الروضة", total: "59.00 ر.س", status: "تم التسليم", time: "منذ 39 دقيقة", captain: "عمر حسن" },
  { id: "#PH-2044", customer: "نورة خالد", area: "حي الندى", total: "167.25 ر.س", status: "تم التسليم", time: "منذ ساعة", captain: "أحمد رجب" },
];

const captains: Captain[] = [
  { name: "خالد العتيبي", phone: "+966 55 284 1093", area: "شمال المدينة", status: "في مهمة", orders: 18, rating: "4.9" },
  { name: "عمر حسن", phone: "+966 54 711 8832", area: "وسط المدينة", status: "متاح", orders: 24, rating: "4.8" },
  { name: "أحمد رجب", phone: "+966 50 912 4610", area: "شرق المدينة", status: "في مهمة", orders: 21, rating: "4.7" },
  { name: "سلمان فهد", phone: "+966 56 301 7792", area: "غرب المدينة", status: "غير متصل", orders: 12, rating: "4.6" },
];

const pharmacies = [
  { name: "صيدلية الحياة", location: "حي النخيل", products: 342, orders: 86, status: "نشطة" },
  { name: "صيدلية الشفاء", location: "شارع الجامعة", products: 219, orders: 61, status: "نشطة" },
  { name: "صيدلية عافية", location: "حي الزهراء", products: 187, orders: 44, status: "بانتظار المراجعة" },
];

const navItems = [
  { id: "overview", label: "نظرة عامة", icon: LayoutDashboard },
  { id: "orders", label: "الطلبات", icon: ClipboardList, count: "12" },
  { id: "captains", label: "الكباتن", icon: Truck },
  { id: "pharmacies", label: "الصيدليات", icon: Store },
  { id: "products", label: "المنتجات والمخزون", icon: Pill },
  { id: "customers", label: "العملاء", icon: UsersRound },
];

const statusClass = (status: string) => {
  if (status === "جديد" || status === "متاح" || status === "نشطة") return "status status-green";
  if (status === "قيد التجهيز" || status === "في مهمة" || status === "بانتظار المراجعة") return "status status-amber";
  if (status === "مع الكابتن") return "status status-blue";
  return "status status-gray";
};

function App() {
  const [activePage, setActivePage] = useState("overview");
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState("");
  const [apiConnected, setApiConnected] = useState(false);
  const [apiCaptains, setApiCaptains] = useState<ApiCaptain[]>([]);
  const [links, setLinks] = useState({
    customer: "https://8081-iydxbea3oqx9cazcng396-b30a46c3.us4.manus.computer",
    captain: "https://captain.pharma-delivery.app",
  });

  useEffect(() => {
    let active = true;
    callTrpc("orders.adminList", {}).then((data) => {
      if (!active || !Array.isArray(data)) return;
      setOrders(data.map(mapApiOrder));
      setApiConnected(true);
    }).catch(() => {
      if (active) setApiConnected(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    callTrpc("captains.list").then((data) => {
      if (Array.isArray(data)) setApiCaptains(data);
    }).catch(() => undefined);
  }, []);

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const term = search.trim().toLowerCase();
    return !term || `${order.id} ${order.customer} ${order.area} ${order.status}`.toLowerCase().includes(term);
  }), [orders, search]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const updateOrderStatus = (id: string, status: OrderStatus) => {
    setOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order));
    notify(`تم تحديث حالة الطلب ${id}`);
    const statusMap: Record<OrderStatus, string> = { "جديد": "new", "قيد التجهيز": "preparing", "مع الكابتن": "in_transit", "تم التسليم": "delivered" };
    void callTrpc("orders.setStatus", { orderId: id, status: statusMap[status] }).then(() => setApiConnected(true)).catch(() => notify("تم التحديث محلياً، تعذر الوصول إلى API"));
  };

  const assignCaptain = (id: string) => {
    const captain = apiCaptains.find((item) => item.availability === "available") ?? apiCaptains[0];
    if (!captain) { notify("لا يوجد كابتن مسجل في النظام"); return; }
    void callTrpc("orders.assign", { orderId: id, captainId: captain.id }).then(() => {
      setOrders((current) => current.map((order) => order.id === id ? { ...order, captain: captain.name ?? `كابتن #${captain.id}`, status: "مع الكابتن" } : order));
      notify(`تم تعيين ${captain.name ?? "الكابتن"} للطلب ${id}`);
    }).catch(() => notify("تعذر تعيين الكابتن؛ تحقق من صلاحيات الإدارة"));
  };

  const pageTitle = navItems.find((item) => item.id === activePage)?.label ?? "نظرة عامة";

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><Pill size={25} strokeWidth={2.6} /></div>
          <div><strong>صيدلي</strong><span>لوحة الإدارة</span></div>
        </div>
        <div className="workspace-switcher"><div className="workspace-avatar">ص</div><div><b>منصة صيدلي</b><span>الحساب الرئيسي</span></div><ChevronDown size={15} /></div>
        <div className="nav-section"><span>القائمة الرئيسية</span></div>
        <nav className="main-nav">
          {navItems.map(({ id, label, icon: Icon, count }) => <button key={id} className={`nav-item ${activePage === id ? "active" : ""}`} onClick={() => { setActivePage(id); setMenuOpen(false); }}><Icon size={18} /><span>{label}</span>{count ? <em>{count}</em> : null}</button>)}
        </nav>
        <div className="nav-section nav-section-spaced"><span>النظام</span></div>
        <button className="nav-item" onClick={() => setShowSettings(true)}><Settings size={18} /><span>الإعدادات</span></button>
        <button className="nav-item" onClick={() => notify("مركز المساعدة جاهز للتواصل")}><ShieldCheck size={18} /><span>المساعدة والأمان</span></button>
        <div className="sidebar-footer"><div className="user-avatar">ع</div><div><b>عصام فضل</b><span>مدير النظام</span></div><MoreHorizontal size={18} /></div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen((value) => !value)}><Menu size={21} /></button>
          <div className="breadcrumb"><span>الرئيسية</span><ArrowLeft size={14} /><b>{pageTitle}</b></div>
          <div className="topbar-actions"><span className={`api-status ${apiConnected ? "connected" : "offline"}`}>{apiConnected ? "API متصل" : "وضع تجريبي"}</span><button className="icon-button notification-button" onClick={() => notify("لا توجد إشعارات جديدة")}><Bell size={19} /><i /></button><div className="topbar-divider" /><div className="topbar-profile"><div className="user-avatar small">ع</div><div><b>عصام فضل</b><span>مدير النظام</span></div><ChevronDown size={15} /></div></div>
        </header>

        <div className="page-wrap">
          {activePage === "overview" ? <Overview links={links} onOpenSettings={() => setShowSettings(true)} onNavigate={setActivePage} onNotify={notify} /> : null}
          {activePage === "orders" ? <OrdersPage orders={filteredOrders} search={search} setSearch={setSearch} onStatus={updateOrderStatus} onAssign={assignCaptain} onNotify={notify} /> : null}
          {activePage === "captains" ? <CaptainsPage onNotify={notify} /> : null}
          {activePage === "pharmacies" ? <PharmaciesPage onNotify={notify} /> : null}
          {activePage === "products" ? <ProductsPage onNotify={notify} /> : null}
          {activePage === "customers" ? <CustomersPage onNotify={notify} /> : null}
        </div>
      </main>

      {showSettings ? <SettingsModal links={links} setLinks={setLinks} onClose={() => setShowSettings(false)} onNotify={notify} /> : null}
      {toast ? <div className="toast"><Check size={17} />{toast}</div> : null}
    </div>
  );
}

function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow ?? "منصة صيدلي"}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>;
}

function Overview({ links, onOpenSettings, onNavigate, onNotify }: { links: { customer: string; captain: string }; onOpenSettings: () => void; onNavigate: (page: string) => void; onNotify: (message: string) => void }) {
  const stats = [
    { label: "إجمالي الطلبات", value: "1,284", change: "+12.8%", icon: ClipboardList, tone: "teal" },
    { label: "طلبات اليوم", value: "48", change: "+8.4%", icon: PackageCheck, tone: "blue" },
    { label: "قيمة المبيعات", value: "18,492 ر.س", change: "+16.2%", icon: Activity, tone: "amber" },
    { label: "الكباتن النشطون", value: "16 / 24", change: "66.7%", icon: Truck, tone: "purple" },
  ];
  return <>
    <PageHeading eyebrow="الأحد، 28 سبتمبر 2026" title="صباح الخير، عصام" subtitle="إليك ملخص أداء منصة صيدلي لهذا اليوم" action={<button className="primary-button" onClick={() => onNavigate("orders")}><ClipboardList size={17} />عرض الطلبات الجديدة</button>} />
    <div className="stats-grid">{stats.map(({ label, value, change, icon: Icon, tone }) => <div className="stat-card" key={label}><div className={`stat-icon ${tone}`}><Icon size={20} /></div><div className="stat-meta"><span>{label}</span><b>{value}</b><small><strong>{change}</strong> مقارنة بالأسبوع الماضي</small></div><div className="mini-chart"><span /><span /><span /><span /><span /><span /></div></div>)}</div>
    <div className="content-grid two-col">
      <section className="panel chart-panel"><div className="panel-heading"><div><h2>أداء المبيعات</h2><p>إجمالي المبيعات خلال آخر 7 أيام</p></div><button className="select-button">آخر 7 أيام <ChevronDown size={14} /></button></div><div className="chart-legend"><span><i className="dot teal-dot" />المبيعات</span><strong>18,492 ر.س</strong></div><div className="bar-chart">{[48, 62, 44, 72, 58, 87, 76].map((height, index) => <div className="bar-column" key={index}><div className={`bar ${index === 5 ? "highlight" : ""}`} style={{ height: `${height}%` }} /><span>{["الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"][index]}</span></div>)}</div></section>
      <section className="panel delivery-panel"><div className="panel-heading"><div><h2>التوصيل المباشر</h2><p>توزيع الكباتن وحالات الطلبات الآن</p></div><button className="ghost-icon" onClick={() => onNotify("خريطة التوصيل ستكون متاحة بعد ربط الخرائط")}><ExternalLink size={17} /></button></div><div className="delivery-map"><div className="map-grid" /><div className="map-route route-one" /><div className="map-route route-two" /><div className="map-pin pin-one"><Truck size={13} /></div><div className="map-pin pin-two"><MapPin size={13} /></div><div className="map-pin pin-three"><MapPin size={13} /></div><div className="map-label label-one">خالد العتيبي</div><div className="map-label label-two">12 طلباً</div></div><div className="delivery-foot"><span><i className="live-dot" />16 كابتن متصل</span><b>8 طلبات في الطريق</b><button onClick={() => onNotify("سيتم فتح الخريطة عند ربط مزود الخرائط")}>فتح الخريطة <ArrowLeft size={14} /></button></div></section>
    </div>
    <section className="panel recent-panel"><div className="panel-heading"><div><h2>أحدث الطلبات</h2><p>آخر الطلبات الواردة إلى المنصة</p></div><button className="text-button" onClick={() => onNavigate("orders")}>عرض الكل <ArrowLeft size={15} /></button></div><OrderTable orders={initialOrders.slice(0, 4)} compact onStatus={() => undefined} onAssign={() => undefined} /></section>
    <section className="quick-links"><div className="quick-link-card"><div className="quick-link-icon teal-bg"><Link2 size={19} /></div><div><b>روابط التطبيقات</b><span>إدارة روابط العميل والكابتن</span></div><button onClick={onOpenSettings}><ArrowLeft size={16} /></button></div><div className="quick-link-card"><div className="quick-link-icon amber-bg"><Store size={19} /></div><div><b>طلبات الصيدليات</b><span>3 طلبات بانتظار المراجعة</span></div><button onClick={() => onNavigate("pharmacies")}><ArrowLeft size={16} /></button></div><div className="quick-link-card"><div className="quick-link-icon blue-bg"><UserRound size={19} /></div><div><b>إضافة كابتن</b><span>تسجيل كابتن جديد</span></div><button onClick={() => onNavigate("captains")}><ArrowLeft size={16} /></button></div></section>
    <section className="app-links-panel"><div><div className="eyebrow">بوابة التطبيقات</div><h2>الوصول السريع للتطبيقات المستقلة</h2><p>يمكن تغيير الروابط من الإعدادات بعد نشر كل تطبيق.</p></div><div className="app-link-actions"><a href={links.customer} target="_blank" rel="noreferrer"><CircleUserRound size={17} /><span><b>تطبيق العميل</b><small>فتح التطبيق</small></span><ExternalLink size={14} /></a><a href={links.captain} target="_blank" rel="noreferrer"><Truck size={17} /><span><b>تطبيق الكابتن</b><small>فتح التطبيق</small></span><ExternalLink size={14} /></a><button onClick={onOpenSettings}><Settings size={16} />تعديل الروابط</button></div></section>
  </>;
}

function OrdersPage({ orders, search, setSearch, onStatus, onAssign, onNotify }: { orders: Order[]; search: string; setSearch: (value: string) => void; onStatus: (id: string, status: OrderStatus) => void; onAssign: (id: string) => void; onNotify: (message: string) => void }) {
  return <><PageHeading eyebrow="العمليات اليومية" title="إدارة الطلبات" subtitle="تابع كل طلب من لحظة استلامه حتى التسليم" action={<button className="primary-button" onClick={() => onNotify("نموذج إنشاء الطلب جاهز للربط بقاعدة البيانات")}><Plus size={17} />إضافة طلب</button>} /><div className="filter-row"><div className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث برقم الطلب أو اسم العميل..." /></div><button className="filter-button">كل الحالات <ChevronDown size={15} /></button><button className="filter-button">اليوم <ChevronDown size={15} /></button><div className="filter-spacer" /><span className="results-count">{orders.length} طلبات</span></div><section className="panel full-panel"><OrderTable orders={orders} onStatus={onStatus} onAssign={onAssign} onNotify={onNotify} /></section></>;
}

function OrderTable({ orders, compact = false, onStatus, onAssign, onNotify }: { orders: Order[]; compact?: boolean; onStatus: (id: string, status: OrderStatus) => void; onAssign: (id: string) => void; onNotify?: (message: string) => void }) {
  return <div className="table-wrap"><table><thead><tr><th>رقم الطلب</th><th>العميل</th><th>الموقع</th><th>القيمة</th><th>الحالة</th><th>الكابتن</th><th>الوقت</th><th /></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><b className="order-id">{order.id}</b></td><td><div className="person-cell"><div className="person-avatar">{order.customer.slice(0, 1)}</div><span>{order.customer}</span></div></td><td><span className="location-cell"><MapPin size={13} />{order.area}</span></td><td><b>{order.total}</b></td><td><button className={statusClass(order.status)} onClick={() => { const next: OrderStatus = order.status === "جديد" ? "قيد التجهيز" : order.status === "قيد التجهيز" ? "مع الكابتن" : order.status === "مع الكابتن" ? "تم التسليم" : "تم التسليم"; onStatus(order.id, next); }}>{order.status}<ChevronDown size={12} /></button></td><td>{order.captain === "غير معيّن" ? <button className="assign-button" onClick={() => onAssign(order.id)}>+ تعيين كابتن</button> : <span className="captain-cell"><span className="captain-dot" />{order.captain}</span>}</td><td><span className="time-cell">{order.time}</span></td><td><button className="row-menu" onClick={() => onNotify?.(`خيارات الطلب ${order.id}`)}><MoreHorizontal size={17} /></button></td></tr>)}</tbody></table>{!orders.length ? <div className="empty-state"><ClipboardList size={27} /><b>لا توجد طلبات مطابقة</b><span>جرب تعديل عبارة البحث</span></div> : null}</div>;
}

function CaptainsPage({ onNotify }: { onNotify: (message: string) => void }) {
  return <><PageHeading eyebrow="فريق التوصيل" title="الكباتن" subtitle="إدارة فريق التوصيل ومتابعة حالة كل كابتن" action={<button className="primary-button" onClick={() => onNotify("نموذج إضافة الكابتن جاهز للربط")}><Plus size={17} />إضافة كابتن</button>} /><div className="captain-summary"><div><span>إجمالي الكباتن</span><b>24</b></div><div><span>متاح الآن</span><b className="green-text">16</b></div><div><span>في مهمة</span><b className="amber-text">6</b></div><div><span>غير متصل</span><b className="gray-text">2</b></div></div><section className="panel full-panel"><div className="panel-heading"><div><h2>فريق التوصيل</h2><p>آخر تحديث منذ دقيقة</p></div><button className="filter-button">ترتيب حسب الحالة <ChevronDown size={14} /></button></div><div className="captains-grid">{captains.map((captain) => <div className="captain-card" key={captain.name}><div className="captain-card-top"><div className="captain-large-avatar">{captain.name.slice(0, 1)}</div><button className="row-menu"><MoreHorizontal size={17} /></button></div><b className="captain-name">{captain.name}</b><span className="captain-phone">{captain.phone}</span><div className="captain-area"><MapPin size={13} />{captain.area}</div><div className="captain-card-divider" /><div className="captain-card-stats"><span><b>{captain.orders}</b> طلباً هذا الشهر</span><span>★ <b>{captain.rating}</b></span></div><div className="captain-card-bottom"><span className={statusClass(captain.status)}>{captain.status}</span><button onClick={() => onNotify(`فتح ملف ${captain.name}`)}>عرض الملف <ArrowLeft size={13} /></button></div></div>)}</div></section></>;
}

function PharmaciesPage({ onNotify }: { onNotify: (message: string) => void }) {
  return <><PageHeading eyebrow="الشركاء" title="الصيدليات" subtitle="إدارة الصيدليات والمنتجات المتاحة على المنصة" action={<button className="primary-button" onClick={() => onNotify("نموذج إضافة صيدلية جاهز للربط")}><Plus size={17} />إضافة صيدلية</button>} /><div className="stats-grid compact-stats"><div className="stat-card"><div className="stat-icon teal"><Store size={20} /></div><div className="stat-meta"><span>الصيدليات النشطة</span><b>18</b><small><strong>+2</strong> هذا الشهر</small></div></div><div className="stat-card"><div className="stat-icon blue"><Pill size={20} /></div><div className="stat-meta"><span>منتجات في الكتالوج</span><b>4,862</b><small><strong>+184</strong> هذا الشهر</small></div></div><div className="stat-card"><div className="stat-icon amber"><ClipboardList size={20} /></div><div className="stat-meta"><span>طلبات المراجعة</span><b>3</b><small>تحتاج إجراءً</small></div></div></div><section className="panel full-panel"><div className="panel-heading"><div><h2>الصيدليات المسجلة</h2><p>شركاء منصة صيدلي</p></div><div className="search-box small-search"><Search size={16} /><input placeholder="ابحث عن صيدلية..." /></div></div><div className="table-wrap"><table><thead><tr><th>الصيدلية</th><th>الموقع</th><th>المنتجات</th><th>الطلبات</th><th>الحالة</th><th /></tr></thead><tbody>{pharmacies.map((pharmacy) => <tr key={pharmacy.name}><td><div className="person-cell"><div className="store-avatar"><Store size={16} /></div><b>{pharmacy.name}</b></div></td><td><span className="location-cell"><MapPin size={13} />{pharmacy.location}</span></td><td>{pharmacy.products} منتج</td><td>{pharmacy.orders} طلب</td><td><span className={statusClass(pharmacy.status)}>{pharmacy.status}</span></td><td><button className="text-button" onClick={() => onNotify(`فتح ملف ${pharmacy.name}`)}>التفاصيل <ArrowLeft size={14} /></button></td></tr>)}</tbody></table></div></section></>;
}

function ProductsPage({ onNotify }: { onNotify: (message: string) => void }) {
  const products = [{ name: "بنادول إكسترا", category: "مسكنات الألم", stock: 184, price: "18.50 ر.س", status: "متاح" }, { name: "فيتامين C 1000", category: "الفيتامينات", stock: 62, price: "32.00 ر.س", status: "متاح" }, { name: "لاروش بوزيه SPF50", category: "العناية بالبشرة", stock: 8, price: "86.00 ر.س", status: "مخزون منخفض" }, { name: "أوميغا 3", category: "المكملات الغذائية", stock: 0, price: "59.75 ر.س", status: "نفد المخزون" }];
  return <><PageHeading eyebrow="الكتالوج" title="المنتجات والمخزون" subtitle="تحكم في المنتجات والأسعار وتوفر المخزون" action={<button className="primary-button" onClick={() => onNotify("نموذج إضافة المنتج جاهز للربط")}><Plus size={17} />إضافة منتج</button>} /><section className="panel full-panel"><div className="panel-heading"><div><h2>كتالوج المنتجات</h2><p>4,862 منتجاً من 18 صيدلية</p></div><div className="search-box small-search"><Search size={16} /><input placeholder="ابحث عن منتج..." /></div></div><div className="table-wrap"><table><thead><tr><th>المنتج</th><th>الفئة</th><th>المخزون</th><th>السعر</th><th>الحالة</th><th /></tr></thead><tbody>{products.map((product) => <tr key={product.name}><td><div className="person-cell"><div className="product-avatar"><Pill size={16} /></div><b>{product.name}</b></div></td><td>{product.category}</td><td><b className={product.stock < 10 ? "amber-text" : ""}>{product.stock}</b> قطعة</td><td><b>{product.price}</b></td><td><span className={product.status === "متاح" ? "status status-green" : product.status === "مخزون منخفض" ? "status status-amber" : "status status-gray"}>{product.status}</span></td><td><button className="row-menu" onClick={() => onNotify(`خيارات المنتج ${product.name}`)}><MoreHorizontal size={17} /></button></td></tr>)}</tbody></table></div></section></>;
}

function CustomersPage({ onNotify }: { onNotify: (message: string) => void }) {
  const customers = [{ name: "أحمد سالم", email: "ahmad@example.com", orders: 12, spent: "1,248 ر.س", joined: "منذ 4 أشهر" }, { name: "سارة محمد", email: "sara@example.com", orders: 8, spent: "742 ر.س", joined: "منذ 2 أشهر" }, { name: "مريم عبدالله", email: "maryam@example.com", orders: 17, spent: "2,194 ر.س", joined: "منذ 7 أشهر" }, { name: "يوسف علي", email: "yousef@example.com", orders: 4, spent: "317 ر.س", joined: "منذ شهر" }];
  return <><PageHeading eyebrow="المستخدمون" title="العملاء" subtitle="عرض العملاء ونشاطهم الشرائي على المنصة" action={<button className="secondary-button" onClick={() => onNotify("سيتم تجهيز تقرير العملاء للتصدير")}><ExternalLink size={16} />تصدير التقرير</button>} /><section className="panel full-panel"><div className="panel-heading"><div><h2>قائمة العملاء</h2><p>1,842 عميلاً مسجلاً</p></div><div className="search-box small-search"><Search size={16} /><input placeholder="ابحث عن عميل..." /></div></div><div className="table-wrap"><table><thead><tr><th>العميل</th><th>عدد الطلبات</th><th>إجمالي الإنفاق</th><th>تاريخ الانضمام</th><th /></tr></thead><tbody>{customers.map((customer) => <tr key={customer.email}><td><div className="person-cell"><div className="person-avatar">{customer.name.slice(0, 1)}</div><div><b>{customer.name}</b><small>{customer.email}</small></div></div></td><td>{customer.orders} طلبات</td><td><b>{customer.spent}</b></td><td>{customer.joined}</td><td><button className="text-button" onClick={() => onNotify(`فتح ملف ${customer.name}`)}>عرض الملف <ArrowLeft size={14} /></button></td></tr>)}</tbody></table></div></section></>;
}

function SettingsModal({ links, setLinks, onClose, onNotify }: { links: { customer: string; captain: string }; setLinks: (links: { customer: string; captain: string }) => void; onClose: () => void; onNotify: (message: string) => void }) {
  const [draft, setDraft] = useState(links);
  const save = () => { setLinks(draft); onClose(); onNotify("تم حفظ روابط التطبيقات"); };
  return <div className="modal-backdrop" onClick={onClose}><div className="settings-modal" onClick={(event) => event.stopPropagation()}><div className="modal-heading"><div><div className="eyebrow">الإعدادات</div><h2>روابط التطبيقات</h2><p>ضع روابط النشر المستقلة لتظهر في بوابة الإدارة.</p></div><button className="icon-button" onClick={onClose}><X size={19} /></button></div><div className="link-form"><label>تطبيق العميل <span>الرابط العام الذي يفتحه العميل</span></label><div className="input-with-icon"><Link2 size={17} /><input value={draft.customer} onChange={(event) => setDraft({ ...draft, customer: event.target.value })} placeholder="https://customer.example.com" /></div><label>تطبيق الكابتن <span>الرابط العام لتطبيق التوصيل</span></label><div className="input-with-icon"><Truck size={17} /><input value={draft.captain} onChange={(event) => setDraft({ ...draft, captain: event.target.value })} placeholder="https://captain.example.com" /></div></div><div className="modal-note"><Link2 size={16} /><span>يمكن تغيير الروابط بعد نشر كل تطبيق بشكل مستقل، دون تحديث لوحة الإدارة.</span></div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>إلغاء</button><button className="primary-button" onClick={save}><Check size={16} />حفظ الروابط</button></div></div></div>;
}

export default App;

createRoot(document.getElementById("root")!).render(<App />);
