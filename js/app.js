// ===== FIREBASE =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCb4NWp87Mff27qYupoHLum93vTGmiRnD8",
  authDomain: "gestor-facturacion-4d3f8.firebaseapp.com",
  projectId: "gestor-facturacion-4d3f8",
  storageBucket: "gestor-facturacion-4d3f8.firebasestorage.app",
  messagingSenderId: "122288710262",
  appId: "1:122288710262:web:ded3a2f1c17d3bf9da7557"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// ===== LOG HELPER =====
async function registrarLog(accion, tipo, descripcion) {
  await addDoc(collection(db, "historial"), {
    accion,
    tipo,
    descripcion,
    fecha: new Date().toISOString(),
  });
}

// ===== CONTRASEÑA ADMIN =====
const PASSWORD_ADMIN = "admin123";
let modoAdmin = false;

// ===== TEMA =====
let temaOscuro = localStorage.getItem("tema") === "dark";

function aplicarTema() {
  if (temaOscuro) {
    document.documentElement.setAttribute("data-theme", "dark");
    document.getElementById("btn-tema").innerHTML = '<i class="fa-solid fa-sun"></i><span>Tema claro</span>';
  } else {
    document.documentElement.removeAttribute("data-theme");
    document.getElementById("btn-tema").innerHTML = '<i class="fa-solid fa-moon"></i><span>Tema oscuro</span>';
  }
}

document.getElementById("btn-tema").addEventListener("click", () => {
  temaOscuro = !temaOscuro;
  localStorage.setItem("tema", temaOscuro ? "dark" : "light");
  aplicarTema();
  if (document.getElementById("seccion-estadisticas").classList.contains("activa")) {
    setTimeout(cargarEstadisticas, 50);
  }
});

aplicarTema();

// ===== NAVEGACIÓN =====
function mostrarSeccion(nombre) {
  document.querySelectorAll(".seccion").forEach(s => s.classList.remove("activa"));
  document.querySelectorAll(".sidebar-nav-item").forEach(b => b.classList.remove("activo"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("activo"));
  document.getElementById(`seccion-${nombre}`).classList.add("activa");
  const sideBtn = document.getElementById(`side-${nombre}`);
  if (sideBtn) sideBtn.classList.add("activo");
  const navBtn = document.getElementById(`nav-${nombre}`);
  if (navBtn) navBtn.classList.add("activo");
  if (nombre === "dashboard") cargarDashboard();
  if (nombre === "historial") cargarHistorial();
  if (nombre === "estadisticas") cargarEstadisticas();
  document.getElementById("barra-busqueda").classList.add("oculto");
}

window.mostrarSeccion = mostrarSeccion;

// ===== MODO ADMIN =====
document.getElementById("btn-admin").addEventListener("click", () => {
  modoAdmin ? salirModoAdmin() : abrirModal();
});

function abrirModal() {
  document.getElementById("modal-admin").classList.remove("oculto");
  document.getElementById("input-password").focus();
}

function cerrarModal() {
  document.getElementById("modal-admin").classList.add("oculto");
  document.getElementById("input-password").value = "";
}

function verificarPassword() {
  const input = document.getElementById("input-password").value;
  if (input === PASSWORD_ADMIN) {
    modoAdmin = true;
    cerrarModal();
    activarModoAdmin();
  } else {
    alert("Contraseña incorrecta");
    document.getElementById("input-password").value = "";
  }
}

function activarModoAdmin() {
  const btn = document.getElementById("btn-admin");
  btn.classList.add("admin-activo");
  btn.innerHTML = '<i class="fa-solid fa-lock-open"></i><span>Admin</span>';
  document.getElementById("btn-nueva-empresa").classList.remove("oculto");
  document.getElementById("btn-nueva-factura").classList.remove("oculto");
  document.getElementById("btn-nuevo-contrato").classList.remove("oculto");
  document.getElementById("btn-limpiar-historial").classList.remove("oculto");
  cargarDashboard();
  cargarEmpresas();
  cargarFacturas();
  cargarContratos();
  cargarHistorial();
}

function salirModoAdmin() {
  modoAdmin = false;
  const btn = document.getElementById("btn-admin");
  btn.classList.remove("admin-activo");
  btn.innerHTML = '<i class="fa-solid fa-lock"></i><span>Admin</span>';
  document.getElementById("btn-nueva-empresa").classList.add("oculto");
  document.getElementById("btn-nueva-factura").classList.add("oculto");
  document.getElementById("btn-nuevo-contrato").classList.add("oculto");
  document.getElementById("btn-limpiar-historial").classList.add("oculto");
  cargarDashboard();
  cargarEmpresas();
  cargarFacturas();
  cargarContratos();
  cargarHistorial();
}

document.getElementById("input-password").addEventListener("keydown", e => {
  if (e.key === "Enter") verificarPassword();
});

document.getElementById("modal-admin").addEventListener("click", e => {
  if (e.target === document.getElementById("modal-admin")) cerrarModal();
});

// ===== HELPERS =====
function diasRestantes(vencimiento) {
  if (!vencimiento) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vence = new Date(vencimiento);
  return Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
}

function calcularEstadoContrato(vencimiento) {
  const dias = diasRestantes(vencimiento);
  if (dias === null) return "vigente";
  if (dias < 0) return "vencido";
  if (dias <= 30) return "por-vencer";
  return "vigente";
}

function iniciales(nombre) {
  return nombre.split(" ").map(p => p[0]).join("").substring(0, 2).toUpperCase();
}

function tiempoRelativo(fecha) {
  if (!fecha) return "";
  const hoy = new Date();
  const f = new Date(fecha);
  const dias = Math.floor((hoy - f) / (1000 * 60 * 60 * 24));
  if (dias === 0) return "hoy";
  if (dias === 1) return "hace 1 día";
  if (dias < 7) return `hace ${dias} días`;
  if (dias < 30) return `hace ${Math.floor(dias / 7)} sem.`;
  return `hace ${Math.floor(dias / 30)} mes${Math.floor(dias / 30) > 1 ? "es" : ""}`;
}

const coloresAvatar = [
  { bg: "#dbeafe", color: "#1e40af" },
  { bg: "#dcfce7", color: "#166534" },
  { bg: "#fce7f3", color: "#9d174d" },
  { bg: "#fef3c7", color: "#92400e" },
  { bg: "#ede9fe", color: "#5b21b6" },
];

function colorAvatar(nombre) {
  let hash = 0;
  for (let c of nombre) hash += c.charCodeAt(0);
  return coloresAvatar[hash % coloresAvatar.length];
}

// ===== MODAL ESTADO DE CUENTA =====
function mostrarEstadoCuenta(empresaId, empresaNombre, facturas, contratos) {
  // Eliminar modal previo si existe
  const prev = document.getElementById("modal-estado-cuenta");
  if (prev) prev.remove();

  const col = colorAvatar(empresaNombre);
  const facturasEmpresa = [];
  facturas.forEach(d => {
    if (d.data().empresaId === empresaId) facturasEmpresa.push({ id: d.id, ...d.data() });
  });
  const contratosEmpresa = [];
  contratos.forEach(d => {
    if (d.data().empresaId === empresaId) contratosEmpresa.push({ id: d.id, ...d.data() });
  });

  const totalPendiente = facturasEmpresa
    .filter(f => f.estado === "pendiente" || f.estado === "vencida")
    .reduce((acc, f) => acc + (f.monto || 0), 0);

  const estadoLabel = { pendiente: "Pendiente", pagada: "Pagada", vencida: "Vencida", anulada: "Anulada" };
  const estadoContratoLabel = { vigente: "Vigente", "por-vencer": "Por vencer", vencido: "Vencido" };

  let facturasHTML = facturasEmpresa.length === 0
    ? `<p class="ec-vacio">Sin facturas</p>`
    : facturasEmpresa.map(f => `
        <div class="ec-item">
          <div class="ec-item-left">
            <span class="ec-item-titulo">Factura ${f.numero}</span>
            <span class="ec-item-sub">${f.emision || "—"}</span>
          </div>
          <div class="ec-item-right">
            <span class="ec-monto">$ ${(f.monto || 0).toLocaleString("es-AR")}</span>
            <span class="post-badge badge-${f.estado}">${estadoLabel[f.estado]}</span>
          </div>
        </div>`).join("");

  let contratosHTML = contratosEmpresa.length === 0
    ? `<p class="ec-vacio">Sin contratos</p>`
    : contratosEmpresa.map(c => {
        const est = calcularEstadoContrato(c.vencimiento);
        const dias = diasRestantes(c.vencimiento);
        const diasTxt = dias !== null ? (dias < 0 ? `Venció hace ${Math.abs(dias)} días` : `Vence en ${dias} días`) : "";
        return `
        <div class="ec-item">
          <div class="ec-item-left">
            <span class="ec-item-titulo">${c.nombre}</span>
            <span class="ec-item-sub">${diasTxt}</span>
          </div>
          <div class="ec-item-right">
            ${c.monto ? `<span class="ec-monto">$ ${c.monto.toLocaleString("es-AR")}</span>` : ""}
            <span class="post-badge badge-${est}">${estadoContratoLabel[est]}</span>
          </div>
        </div>`;
      }).join("");

  const modal = document.createElement("div");
  modal.id = "modal-estado-cuenta";
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-contenido modal-ec">
      <div class="ec-header">
        <div class="avatar" style="width:48px;height:48px;font-size:16px;background:${col.bg};color:${col.color}">${iniciales(empresaNombre)}</div>
        <div>
          <div class="ec-empresa-nombre">${empresaNombre}</div>
          <div class="ec-resumen">Total pendiente: <strong>$ ${totalPendiente.toLocaleString("es-AR")}</strong></div>
        </div>
        <button class="ec-cerrar" id="btn-cerrar-ec"><i class="fa-solid fa-x"></i></button>
      </div>
      <div class="ec-seccion-titulo">Facturas</div>
      <div class="ec-lista">${facturasHTML}</div>
      <div class="ec-seccion-titulo">Contratos</div>
      <div class="ec-lista">${contratosHTML}</div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById("btn-cerrar-ec").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
}

// ===== MODAL LISTA DETALLE (para panel derecho y alertas) =====
function mostrarListaDetalle(titulo, items) {
  const prev = document.getElementById("modal-lista-detalle");
  if (prev) prev.remove();

  const modal = document.createElement("div");
  modal.id = "modal-lista-detalle";
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-contenido modal-ec">
      <div class="ec-header">
        <div class="ec-empresa-nombre">${titulo}</div>
        <button class="ec-cerrar" id="btn-cerrar-ld"><i class="fa-solid fa-x"></i></button>
      </div>
      <div class="ec-lista">${items}</div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById("btn-cerrar-ld").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
}

// ===== DASHBOARD =====
async function cargarDashboard() {
  const [snapEmpresas, snapFacturas, snapContratos] = await Promise.all([
    getDocs(collection(db, "empresas")),
    getDocs(collection(db, "facturas")),
    getDocs(collection(db, "contratos")),
  ]);

  cargarRightPanel(snapEmpresas, snapFacturas, snapContratos);

  // Stats
  let totalPendiente = 0, facturasPendientes = 0, contratosPorVencer = 0;
  const listaFacturasPendientes = [];
  const listaContratosPorVencer = [];

  snapFacturas.forEach(d => {
    const f = d.data();
    if (f.estado === "pendiente" || f.estado === "vencida") {
      totalPendiente += f.monto || 0;
      facturasPendientes++;
      listaFacturasPendientes.push({ id: d.id, ...f });
    }
  });

  snapContratos.forEach(d => {
    const dias = diasRestantes(d.data().vencimiento);
    if (dias !== null && dias >= 0 && dias <= 30) {
      contratosPorVencer++;
      listaContratosPorVencer.push({ id: d.id, ...d.data(), dias });
    }
  });

  const elTotal = document.getElementById("dash-total-pendiente");
  elTotal.textContent = `$ ${totalPendiente.toLocaleString("es-AR")}`;
  elTotal.classList.remove("stat-update");
  void elTotal.offsetWidth;
  elTotal.classList.add("stat-update");
  document.getElementById("dash-facturas-pendientes").textContent = facturasPendientes;
  document.getElementById("dash-contratos-vencer").textContent = contratosPorVencer;

  // Stories
  const storiesWrap = document.getElementById("stories-wrap");
  storiesWrap.innerHTML = "";
  snapEmpresas.forEach(d => {
    const e = d.data();
    let tieneDeuda = false, tieneContratoVencer = false;
    snapFacturas.forEach(f => {
      if (f.data().empresaId === d.id && (f.data().estado === "pendiente" || f.data().estado === "vencida")) tieneDeuda = true;
    });
    snapContratos.forEach(c => {
      const dias = diasRestantes(c.data().vencimiento);
      if (c.data().empresaId === d.id && dias !== null && dias >= 0 && dias <= 30) tieneContratoVencer = true;
    });

    const claseRing = tieneDeuda ? "deuda" : tieneContratoVencer ? "advertencia" : "al-dia";
    const col = colorAvatar(e.nombre);

    const story = document.createElement("div");
    story.className = "story";
    story.style.cursor = "pointer";
    story.innerHTML = `
      <div class="story-ring ${claseRing}" style="background:${col.bg};color:${col.color}">${iniciales(e.nombre)}</div>
      <span class="story-label">${e.nombre}</span>
    `;
    // FIX #5: stories clickeables → estado de cuenta
    story.addEventListener("click", () => {
      mostrarEstadoCuenta(d.id, e.nombre, snapFacturas, snapContratos);
    });
    storiesWrap.appendChild(story);
  });

  // Alertas del dashboard
  const dashAlertas = document.getElementById("dash-alertas");
  dashAlertas.innerHTML = "";
  const alertas = [];
  snapContratos.forEach(d => {
    const c = d.data();
    const dias = diasRestantes(c.vencimiento);
    if (dias !== null && dias >= 0 && dias <= 30) alertas.push({ id: d.id, nombre: c.nombre, empresa: c.empresaNombre, dias, ...c });
  });

  if (alertas.length > 0) {
    const wrap = document.createElement("div");
    wrap.className = "alertas-wrap";
    alertas.sort((a, b) => a.dias - b.dias).forEach((a, idx) => {
      const clase = a.dias <= 7 ? "alerta-7" : a.dias <= 15 ? "alerta-15" : "alerta-30";
      const icono = a.dias <= 7 ? "fa-circle-exclamation" : "fa-triangle-exclamation";
      const item = document.createElement("div");
      item.className = `alerta-item ${clase}`;
      item.style.cursor = "pointer";
      item.innerHTML = `<i class="fa-solid ${icono}"></i> <span><strong>${a.nombre}</strong> (${a.empresa}) vence en <strong>${a.dias} día${a.dias !== 1 ? "s" : ""}</strong></span>`;
      // FIX #7: alertas clickeables → muestra el contrato
      item.addEventListener("click", () => {
        const estadoLabel = { vigente: "Vigente", "por-vencer": "Por vencer", vencido: "Vencido" };
        const est = calcularEstadoContrato(a.vencimiento);
        const itemsHTML = `
          <div class="ec-item">
            <div class="ec-item-left">
              <span class="ec-item-titulo">${a.nombre}</span>
              <span class="ec-item-sub">${a.empresa} · Vence en ${a.dias} día${a.dias !== 1 ? "s" : ""}</span>
            </div>
            <div class="ec-item-right">
              ${a.monto ? `<span class="ec-monto">$ ${a.monto.toLocaleString("es-AR")}</span>` : ""}
              <span class="post-badge badge-${est}">${estadoLabel[est]}</span>
            </div>
          </div>`;
        mostrarListaDetalle("Contrato por vencer", itemsHTML);
      });
      item.style.setProperty('--i', idx);
      wrap.appendChild(item);
    });
    dashAlertas.appendChild(wrap);
  }

  // Feed
  const feed = document.getElementById("feed-dashboard");
  feed.innerHTML = "";
  const items = [];

  snapFacturas.forEach(d => {
    const f = d.data();
    items.push({ tipo: "factura", id: d.id, fecha: f.emision, ...f });
  });

  snapContratos.forEach(d => {
    const c = d.data();
    items.push({ tipo: "contrato", id: d.id, fecha: c.inicio, ...c });
  });

  if (items.length === 0) {
    feed.innerHTML = `<p class="texto-vacio">Cargá empresas, facturas y contratos para verlos acá.</p>`;
    return;
  }

  items.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  items.forEach((item, idx) => {
    const col = colorAvatar(item.empresaNombre || "?");
    const post = document.createElement("div");
    post.className = "post";

    if (item.tipo === "factura") {
      const estadoLabel = { pendiente: "Pendiente", pagada: "Pagada", vencida: "Vencida", anulada: "Anulada" };
      post.innerHTML = `
        <div class="post-header">
          <div class="avatar" style="background:${col.bg};color:${col.color}">${iniciales(item.empresaNombre || "?")}</div>
          <div class="post-meta">
            <div class="post-empresa">${item.empresaNombre}</div>
            <div class="post-fecha">${tiempoRelativo(item.emision)}</div>
          </div>
          <span class="post-badge badge-${item.estado}">${estadoLabel[item.estado]}</span>
        </div>
        <div class="post-body">
          <div class="post-numero">Factura ${item.numero}</div>
          <div class="post-monto">$ ${(item.monto || 0).toLocaleString("es-AR")}</div>
          ${item.imputacion ? `<div class="post-detalle">📒 ${item.imputacion}</div>` : ""}
          ${item.vencimiento ? `<div class="post-detalle">📅 Vence: ${item.vencimiento}</div>` : ""}
        </div>
        <div class="post-actions">
          ${item.pdfURL ? `<a href="${item.pdfURL}" target="_blank" class="post-action-btn"><i class="fa-solid fa-file-pdf"></i> Ver PDF</a>` : ""}
          ${item.notas ? `<span class="post-action-btn"><i class="fa-solid fa-note-sticky"></i> ${item.notas}</span>` : ""}
        </div>
        ${modoAdmin ? `
        <div class="post-admin-actions">
          <button class="btn-editar" onclick="editarFactura('${item.id}');mostrarSeccion('facturas')">Editar</button>
          <button class="btn-eliminar" onclick="eliminarFactura('${item.id}')">Eliminar</button>
        </div>` : ""}
      `;
    } else {
      const estadoActual = calcularEstadoContrato(item.vencimiento);
      const estadoLabel = { vigente: "Vigente", "por-vencer": "Por vencer", vencido: "Vencido" };
      const dias = diasRestantes(item.vencimiento);
      post.innerHTML = `
        <div class="post-header">
          <div class="avatar" style="background:${col.bg};color:${col.color}">${iniciales(item.empresaNombre || "?")}</div>
          <div class="post-meta">
            <div class="post-empresa">${item.empresaNombre}</div>
            <div class="post-fecha">${tiempoRelativo(item.inicio)}</div>
          </div>
          <span class="post-badge badge-${estadoActual}">${estadoLabel[estadoActual]}</span>
        </div>
        <div class="post-body">
          <div class="post-numero">📑 ${item.tipo || "Contrato"}</div>
          <div class="post-monto">${item.nombre}</div>
          ${item.monto ? `<div class="post-detalle">$ ${item.monto.toLocaleString("es-AR")}</div>` : ""}
          ${dias !== null ? `<div class="post-detalle">⏳ ${dias >= 0 ? `Vence en ${dias} día${dias !== 1 ? "s" : ""}` : `Venció hace ${Math.abs(dias)} días`}</div>` : ""}
        </div>
        <div class="post-actions">
          ${item.pdfURL ? `<a href="${item.pdfURL}" target="_blank" class="post-action-btn"><i class="fa-solid fa-file-pdf"></i> Ver PDF</a>` : ""}
          ${item.notas ? `<span class="post-action-btn"><i class="fa-solid fa-note-sticky"></i> ${item.notas}</span>` : ""}
        </div>
        ${modoAdmin ? `
        <div class="post-admin-actions">
          <button class="btn-editar" onclick="editarContrato('${item.id}');mostrarSeccion('contratos')">Editar</button>
          <button class="btn-eliminar" onclick="eliminarContrato('${item.id}')">Eliminar</button>
        </div>` : ""}
      `;
    }
    post.style.setProperty('--i', idx);
    feed.appendChild(post);
  });
}

// ===== EMPRESAS =====
let empresaEditandoId = null;

async function cargarEmpresasEnSelect(selectId) {
  const select = document.getElementById(selectId);
  // Limpiar opciones previas excepto la primera
  while (select.options.length > 1) select.remove(1);
  const snapshot = await getDocs(collection(db, "empresas"));
  snapshot.forEach(docSnap => {
    const opt = document.createElement("option");
    opt.value = docSnap.id;
    opt.textContent = docSnap.data().nombre;
    select.appendChild(opt);
  });
}

document.getElementById("btn-nueva-empresa").addEventListener("click", () => {
  empresaEditandoId = null;
  document.getElementById("form-empresa-titulo").textContent = "Nueva Empresa";
  ["emp-nombre","emp-cuit","emp-email","emp-telefono","emp-notas"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("emp-estado").value = "al-dia";
  document.getElementById("form-empresa").classList.remove("oculto");
});

function cancelarFormEmpresa() {
  document.getElementById("form-empresa").classList.add("oculto");
}

async function guardarEmpresa() {
  const empresa = {
    nombre: document.getElementById("emp-nombre").value.trim(),
    cuit: document.getElementById("emp-cuit").value.trim(),
    email: document.getElementById("emp-email").value.trim(),
    telefono: document.getElementById("emp-telefono").value.trim(),
    estado: document.getElementById("emp-estado").value,
    notas: document.getElementById("emp-notas").value.trim(),
  };
  if (!empresa.nombre) { alert("El nombre es obligatorio"); return; }
  if (empresaEditandoId) {
    await updateDoc(doc(db, "empresas", empresaEditandoId), empresa);
  } else {
    await addDoc(collection(db, "empresas"), empresa);
  }
  await registrarLog(
    empresaEditandoId ? "editó" : "creó",
    "empresa",
    `${empresaEditandoId ? "Editó" : "Creó"} la empresa "${empresa.nombre}"`
  );
  cancelarFormEmpresa();
  cargarEmpresas();
  cargarDashboard();
}

async function cargarEmpresas() {
  const lista = document.getElementById("lista-empresas");
  lista.innerHTML = "";
  const snapshot = await getDocs(collection(db, "empresas"));
  if (snapshot.empty) { lista.innerHTML = `<p class="texto-vacio">No hay empresas cargadas todavía.</p>`; return; }
  snapshot.forEach(docSnap => {
    const e = docSnap.data();
    const id = docSnap.id;
    const col = colorAvatar(e.nombre);
    const estadoClase = e.estado === "al-dia" ? "al-dia" : "pendiente";
    const estadoLabel = e.estado === "al-dia" ? "Al día" : "Deuda pendiente";
    const card = document.createElement("div");
    card.className = "card-empresa-lista";
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
        <div class="avatar" style="background:${col.bg};color:${col.color}">${iniciales(e.nombre)}</div>
        <div>
          <div class="emp-nombre">${e.nombre}</div>
          <span class="estado ${estadoClase}">${estadoLabel}</span>
        </div>
      </div>
      <div class="emp-detalle">CUIT: ${e.cuit || "—"}</div>
      <div class="emp-detalle">📧 ${e.email || "—"} · 📞 ${e.telefono || "—"}</div>
      ${e.notas ? `<div class="emp-detalle">📝 ${e.notas}</div>` : ""}
      ${modoAdmin ? `
      <div class="emp-acciones">
        <button class="btn-editar" onclick="editarEmpresa('${id}')">Editar</button>
        <button class="btn-eliminar" onclick="eliminarEmpresa('${id}')">Eliminar</button>
      </div>` : ""}
    `;
    card.style.setProperty('--i', lista.children.length);
    lista.appendChild(card);
  });
}

async function editarEmpresa(id) {
  const snapshot = await getDocs(collection(db, "empresas"));
  snapshot.forEach(docSnap => {
    if (docSnap.id === id) {
      const e = docSnap.data();
      empresaEditandoId = id;
      document.getElementById("form-empresa-titulo").textContent = "Editar Empresa";
      document.getElementById("emp-nombre").value = e.nombre;
      document.getElementById("emp-cuit").value = e.cuit;
      document.getElementById("emp-email").value = e.email;
      document.getElementById("emp-telefono").value = e.telefono;
      document.getElementById("emp-estado").value = e.estado;
      document.getElementById("emp-notas").value = e.notas;
      document.getElementById("form-empresa").classList.remove("oculto");
    }
  });
}

async function eliminarEmpresa(id) {
  if (confirm("¿Seguro que querés eliminar esta empresa?")) {
    const empSnap = await getDocs(collection(db, "empresas"));
    let nombreEmp = "";
    empSnap.forEach(d => { if (d.id === id) nombreEmp = d.data().nombre; });
    await deleteDoc(doc(db, "empresas", id));
    await registrarLog("eliminó", "empresa", `Eliminó la empresa "${nombreEmp}"`);
    cargarEmpresas();
    cargarDashboard();
  }
}

// ===== FACTURAS =====
let facturaEditandoId = null;

document.getElementById("btn-nueva-factura").addEventListener("click", () => {
  facturaEditandoId = null;
  document.getElementById("form-factura-titulo").textContent = "Nueva Factura";
  ["fac-numero","fac-emision","fac-vencimiento","fac-monto","fac-imputacion","fac-notas"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("fac-empresa").value = "";
  document.getElementById("fac-estado").value = "pendiente";
  document.getElementById("fac-pdf").value = "";
  document.getElementById("fac-pdf-actual").classList.add("oculto");
  document.getElementById("form-factura").classList.remove("oculto");
});

function cancelarFormFactura() {
  document.getElementById("form-factura").classList.add("oculto");
}

async function guardarFactura() {
  const empresaId = document.getElementById("fac-empresa").value;
  const numero = document.getElementById("fac-numero").value.trim();
  if (!empresaId || !numero) { alert("Empresa y número son obligatorios"); return; }

  const empSnap = await getDocs(collection(db, "empresas"));
  let empresaNombre = "";
  empSnap.forEach(d => { if (d.id === empresaId) empresaNombre = d.data().nombre; });

  let pdfURL = "", pdfNombre = "";
  const pdfFile = document.getElementById("fac-pdf").files[0];
  if (pdfFile) {
    const storageRef = ref(storage, `facturas/${empresaId}/${Date.now()}_${pdfFile.name}`);
    await uploadBytes(storageRef, pdfFile);
    pdfURL = await getDownloadURL(storageRef);
    pdfNombre = pdfFile.name;
  }

  const factura = {
    empresaId, empresaNombre, numero,
    emision: document.getElementById("fac-emision").value,
    vencimiento: document.getElementById("fac-vencimiento").value,
    monto: parseFloat(document.getElementById("fac-monto").value) || 0,
    estado: document.getElementById("fac-estado").value,
    imputacion: document.getElementById("fac-imputacion").value.trim(),
    notas: document.getElementById("fac-notas").value.trim(),
    pdfURL: pdfURL || (facturaEditandoId ? undefined : ""),
    pdfNombre: pdfNombre || (facturaEditandoId ? undefined : ""),
  };
  Object.keys(factura).forEach(k => factura[k] === undefined && delete factura[k]);

  if (facturaEditandoId) {
    await updateDoc(doc(db, "facturas", facturaEditandoId), factura);
  } else {
    await addDoc(collection(db, "facturas"), factura);
  }
  await registrarLog(
    facturaEditandoId ? "editó" : "creó",
    "factura",
    `${facturaEditandoId ? "Editó" : "Creó"} la factura ${factura.numero} de ${factura.empresaNombre}`
  );
  cancelarFormFactura();
  cargarFacturas();
  cargarDashboard();
}

async function cargarFacturas() {
  const lista = document.getElementById("lista-facturas");
  lista.innerHTML = "";
  const filtroEmpresa = document.getElementById("filtro-empresa-factura").value;
  const filtroEstado = document.getElementById("filtro-estado-factura").value;
  const snapshot = await getDocs(collection(db, "facturas"));

  if (snapshot.empty) { lista.innerHTML = `<p class="texto-vacio">No hay facturas cargadas todavía.</p>`; return; }

  const estadoLabel = { pendiente: "Pendiente", pagada: "Pagada", vencida: "Vencida", anulada: "Anulada" };
  let hayResultados = false;

  snapshot.forEach(docSnap => {
    const f = docSnap.data();
    const id = docSnap.id;
    if (filtroEmpresa && f.empresaId !== filtroEmpresa) return;
    if (filtroEstado && f.estado !== filtroEstado) return;
    hayResultados = true;
    const col = colorAvatar(f.empresaNombre || "?");
    const post = document.createElement("div");
    post.className = "post";
    post.innerHTML = `
      <div class="post-header">
        <div class="avatar" style="background:${col.bg};color:${col.color}">${iniciales(f.empresaNombre || "?")}</div>
        <div class="post-meta">
          <div class="post-empresa">${f.empresaNombre}</div>
          <div class="post-fecha">${tiempoRelativo(f.emision)}</div>
        </div>
        <span class="post-badge badge-${f.estado}">${estadoLabel[f.estado]}</span>
      </div>
      <div class="post-body">
        <div class="post-numero">Factura ${f.numero}</div>
        <div class="post-monto">$ ${(f.monto || 0).toLocaleString("es-AR")}</div>
        ${f.imputacion ? `<div class="post-detalle">📒 ${f.imputacion}</div>` : ""}
        ${f.vencimiento ? `<div class="post-detalle">📅 Vence: ${f.vencimiento}</div>` : ""}
        ${f.notas ? `<div class="post-detalle">📝 ${f.notas}</div>` : ""}
      </div>
      <div class="post-actions">
        ${f.pdfURL ? `<a href="${f.pdfURL}" target="_blank" class="post-action-btn"><i class="fa-solid fa-file-pdf"></i> Ver PDF</a>` : ""}
      </div>
      ${modoAdmin ? `
      <div class="post-admin-actions">
        <button class="btn-editar" onclick="editarFactura('${id}')">Editar</button>
        <button class="btn-eliminar" onclick="eliminarFactura('${id}')">Eliminar</button>
      </div>` : ""}
    `;
    post.style.setProperty('--i', hayResultados ? lista.children.length : 0);
    lista.appendChild(post);
  });

  if (!hayResultados) lista.innerHTML = `<p class="texto-vacio">No hay facturas con ese filtro.</p>`;
}

async function editarFactura(id) {
  const snapshot = await getDocs(collection(db, "facturas"));
  snapshot.forEach(docSnap => {
    if (docSnap.id === id) {
      const f = docSnap.data();
      facturaEditandoId = id;
      document.getElementById("form-factura-titulo").textContent = "Editar Factura";
      document.getElementById("fac-empresa").value = f.empresaId;
      document.getElementById("fac-numero").value = f.numero;
      document.getElementById("fac-emision").value = f.emision;
      document.getElementById("fac-vencimiento").value = f.vencimiento;
      document.getElementById("fac-monto").value = f.monto;
      document.getElementById("fac-estado").value = f.estado;
      document.getElementById("fac-imputacion").value = f.imputacion;
      document.getElementById("fac-notas").value = f.notas;
      if (f.pdfURL) {
        const el = document.getElementById("fac-pdf-actual");
        el.innerHTML = `📎 PDF actual: <a href="${f.pdfURL}" target="_blank">${f.pdfNombre}</a>`;
        el.classList.remove("oculto");
      }
      document.getElementById("form-factura").classList.remove("oculto");
    }
  });
}

async function eliminarFactura(id) {
  if (confirm("¿Seguro que querés eliminar esta factura?")) {
    const facSnap = await getDocs(collection(db, "facturas"));
    let descFac = "";
    facSnap.forEach(d => { if (d.id === id) descFac = `Factura ${d.data().numero} de ${d.data().empresaNombre}`; });
    await deleteDoc(doc(db, "facturas", id));
    await registrarLog("eliminó", "factura", `Eliminó la ${descFac}`);
    cargarFacturas();
    cargarDashboard();
  }
}

document.getElementById("filtro-empresa-factura").addEventListener("change", cargarFacturas);
document.getElementById("filtro-estado-factura").addEventListener("change", cargarFacturas);

// ===== CONTRATOS =====
let contratoEditandoId = null;

document.getElementById("btn-nuevo-contrato").addEventListener("click", () => {
  contratoEditandoId = null;
  document.getElementById("form-contrato-titulo").textContent = "Nuevo Contrato";
  ["con-nombre","con-tipo","con-inicio","con-vencimiento","con-monto","con-notas"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("con-empresa").value = "";
  document.getElementById("con-pdf").value = "";
  document.getElementById("con-pdf-actual").classList.add("oculto");
  document.getElementById("form-contrato").classList.remove("oculto");
});

function cancelarFormContrato() {
  document.getElementById("form-contrato").classList.add("oculto");
}

async function guardarContrato() {
  const empresaId = document.getElementById("con-empresa").value;
  const nombre = document.getElementById("con-nombre").value.trim();
  if (!empresaId || !nombre) { alert("Empresa y nombre son obligatorios"); return; }

  const empSnap = await getDocs(collection(db, "empresas"));
  let empresaNombre = "";
  empSnap.forEach(d => { if (d.id === empresaId) empresaNombre = d.data().nombre; });

  let pdfURL = "", pdfNombre = "";
  const pdfFile = document.getElementById("con-pdf").files[0];
  if (pdfFile) {
    const storageRef = ref(storage, `contratos/${empresaId}/${Date.now()}_${pdfFile.name}`);
    await uploadBytes(storageRef, pdfFile);
    pdfURL = await getDownloadURL(storageRef);
    pdfNombre = pdfFile.name;
  }

  const vencimiento = document.getElementById("con-vencimiento").value;
  const contrato = {
    empresaId, empresaNombre, nombre,
    tipo: document.getElementById("con-tipo").value.trim(),
    inicio: document.getElementById("con-inicio").value,
    vencimiento,
    monto: parseFloat(document.getElementById("con-monto").value) || 0,
    notas: document.getElementById("con-notas").value.trim(),
    estado: calcularEstadoContrato(vencimiento),
    pdfURL: pdfURL || (contratoEditandoId ? undefined : ""),
    pdfNombre: pdfNombre || (contratoEditandoId ? undefined : ""),
  };
  Object.keys(contrato).forEach(k => contrato[k] === undefined && delete contrato[k]);

  if (contratoEditandoId) {
    await updateDoc(doc(db, "contratos", contratoEditandoId), contrato);
  } else {
    await addDoc(collection(db, "contratos"), contrato);
  }
  await registrarLog(
    contratoEditandoId ? "editó" : "creó",
    "contrato",
    `${contratoEditandoId ? "Editó" : "Creó"} el contrato "${contrato.nombre}" de ${contrato.empresaNombre}`
  );
  cancelarFormContrato();
  cargarContratos();
  cargarDashboard();
}

async function cargarContratos() {
  const lista = document.getElementById("lista-contratos");
  const alertasWrap = document.getElementById("alertas-contratos");
  lista.innerHTML = "";
  alertasWrap.innerHTML = "";

  const filtroEmpresa = document.getElementById("filtro-empresa-contrato").value;
  const filtroEstado = document.getElementById("filtro-estado-contrato").value;
  const snapshot = await getDocs(collection(db, "contratos"));

  if (snapshot.empty) { lista.innerHTML = `<p class="texto-vacio">No hay contratos cargados todavía.</p>`; return; }

  const estadoLabel = { vigente: "Vigente", "por-vencer": "Por vencer", vencido: "Vencido" };

  const alertas = [];
  snapshot.forEach(d => {
    const c = d.data();
    const dias = diasRestantes(c.vencimiento);
    if (dias !== null && dias >= 0 && dias <= 30) alertas.push({ nombre: c.nombre, empresa: c.empresaNombre, dias });
  });

  if (alertas.length > 0) {
    const wrap = document.createElement("div");
    wrap.className = "alertas-wrap";
    alertas.sort((a, b) => a.dias - b.dias).forEach(a => {
      const clase = a.dias <= 7 ? "alerta-7" : a.dias <= 15 ? "alerta-15" : "alerta-30";
      const icono = a.dias <= 7 ? "fa-circle-exclamation" : "fa-triangle-exclamation";
      const item = document.createElement("div");
      item.className = `alerta-item ${clase}`;
      item.innerHTML = `<i class="fa-solid ${icono}"></i> <span><strong>${a.nombre}</strong> (${a.empresa}) vence en <strong>${a.dias} día${a.dias !== 1 ? "s" : ""}</strong></span>`;
      wrap.appendChild(item);
    });
    alertasWrap.appendChild(wrap);
  }

  let hayResultados = false;
  snapshot.forEach(docSnap => {
    const c = docSnap.data();
    const id = docSnap.id;
    const estadoActual = calcularEstadoContrato(c.vencimiento);
    if (filtroEmpresa && c.empresaId !== filtroEmpresa) return;
    if (filtroEstado && estadoActual !== filtroEstado) return;
    hayResultados = true;
    const dias = diasRestantes(c.vencimiento);
    const diasTexto = dias !== null ? (dias < 0 ? `Venció hace ${Math.abs(dias)} días` : `Vence en ${dias} días`) : "";
    const col = colorAvatar(c.empresaNombre || "?");
    const post = document.createElement("div");
    post.className = "post";
    post.innerHTML = `
      <div class="post-header">
        <div class="avatar" style="background:${col.bg};color:${col.color}">${iniciales(c.empresaNombre || "?")}</div>
        <div class="post-meta">
          <div class="post-empresa">${c.empresaNombre}</div>
          <div class="post-fecha">${tiempoRelativo(c.inicio)}</div>
        </div>
        <span class="post-badge badge-${estadoActual}">${estadoLabel[estadoActual]}</span>
      </div>
      <div class="post-body">
        <div class="post-numero">📑 ${c.tipo || "Contrato"}</div>
        <div class="post-monto">${c.nombre}</div>
        ${c.monto ? `<div class="post-detalle">$ ${c.monto.toLocaleString("es-AR")}</div>` : ""}
        ${diasTexto ? `<div class="post-detalle">⏳ ${diasTexto}</div>` : ""}
        ${c.notas ? `<div class="post-detalle">📝 ${c.notas}</div>` : ""}
      </div>
      <div class="post-actions">
        ${c.pdfURL ? `<a href="${c.pdfURL}" target="_blank" class="post-action-btn"><i class="fa-solid fa-file-pdf"></i> Ver PDF</a>` : ""}
      </div>
      ${modoAdmin ? `
      <div class="post-admin-actions">
        <button class="btn-editar" onclick="editarContrato('${id}')">Editar</button>
        <button class="btn-eliminar" onclick="eliminarContrato('${id}')">Eliminar</button>
      </div>` : ""}
    `;
    post.style.setProperty('--i', hayResultados ? lista.children.length : 0);
    lista.appendChild(post);
  });

  if (!hayResultados) lista.innerHTML = `<p class="texto-vacio">No hay contratos con ese filtro.</p>`;
}

async function editarContrato(id) {
  const snapshot = await getDocs(collection(db, "contratos"));
  snapshot.forEach(docSnap => {
    if (docSnap.id === id) {
      const c = docSnap.data();
      contratoEditandoId = id;
      document.getElementById("form-contrato-titulo").textContent = "Editar Contrato";
      document.getElementById("con-empresa").value = c.empresaId;
      document.getElementById("con-nombre").value = c.nombre;
      document.getElementById("con-tipo").value = c.tipo;
      document.getElementById("con-inicio").value = c.inicio;
      document.getElementById("con-vencimiento").value = c.vencimiento;
      document.getElementById("con-monto").value = c.monto;
      document.getElementById("con-notas").value = c.notas;
      if (c.pdfURL) {
        const el = document.getElementById("con-pdf-actual");
        el.innerHTML = `📎 PDF actual: <a href="${c.pdfURL}" target="_blank">${c.pdfNombre}</a>`;
        el.classList.remove("oculto");
      }
      document.getElementById("form-contrato").classList.remove("oculto");
    }
  });
}

async function eliminarContrato(id) {
  if (confirm("¿Seguro que querés eliminar este contrato?")) {
    const conSnap = await getDocs(collection(db, "contratos"));
    let descCon = "";
    conSnap.forEach(d => { if (d.id === id) descCon = `"${d.data().nombre}" de ${d.data().empresaNombre}`; });
    await deleteDoc(doc(db, "contratos", id));
    await registrarLog("eliminó", "contrato", `Eliminó el contrato ${descCon}`);
    cargarContratos();
    cargarDashboard();
  }
}

document.getElementById("filtro-empresa-contrato").addEventListener("change", cargarContratos);
document.getElementById("filtro-estado-contrato").addEventListener("change", cargarContratos);

// ===== INICIALIZAR =====
cargarEmpresasEnSelect("fac-empresa");
cargarEmpresasEnSelect("filtro-empresa-factura");
cargarEmpresasEnSelect("con-empresa");
cargarEmpresasEnSelect("filtro-empresa-contrato");
cargarDashboard();
cargarEmpresas();
cargarFacturas();
cargarContratos();

// ===== EXPONER AL HTML =====
window.cerrarModal = cerrarModal;
window.verificarPassword = verificarPassword;
window.guardarEmpresa = guardarEmpresa;
window.cancelarFormEmpresa = cancelarFormEmpresa;
window.editarEmpresa = editarEmpresa;
window.eliminarEmpresa = eliminarEmpresa;
window.guardarFactura = guardarFactura;
window.cancelarFormFactura = cancelarFormFactura;
window.editarFactura = editarFactura;
window.eliminarFactura = eliminarFactura;
window.guardarContrato = guardarContrato;
window.cancelarFormContrato = cancelarFormContrato;
window.editarContrato = editarContrato;
window.eliminarContrato = eliminarContrato;

// ===== BÚSQUEDA GLOBAL =====
// FIX #1: usar addEventListener en lugar de onclick inline en el sidebar
document.getElementById("side-buscar").addEventListener("click", toggleBusqueda);

document.getElementById("btn-cerrar-busqueda").addEventListener("click", () => {
  cerrarBusqueda();
});

function abrirBusqueda() {
  document.getElementById("barra-busqueda").classList.remove("oculto");
  document.querySelectorAll(".seccion").forEach(s => s.classList.remove("activa"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("activo"));
  document.getElementById("seccion-busqueda").classList.add("activa");
  document.getElementById("input-busqueda").focus();
  document.getElementById("resultados-busqueda").innerHTML = `<p class="sin-resultados">Escribí para buscar...</p>`;
}

function cerrarBusqueda() {
  document.getElementById("barra-busqueda").classList.add("oculto");
  document.getElementById("input-busqueda").value = "";
  mostrarSeccion("dashboard");
}

function toggleBusqueda() {
  const barra = document.getElementById("barra-busqueda");
  const estaOculta = barra.classList.contains("oculto");
  if (estaOculta) {
    abrirBusqueda();
  } else {
    cerrarBusqueda();
  }
}

document.getElementById("input-busqueda").addEventListener("input", async (e) => {
  const query = e.target.value.trim().toLowerCase();
  const contenedor = document.getElementById("resultados-busqueda");

  if (!query) {
    contenedor.innerHTML = `<p class="sin-resultados">Escribí para buscar...</p>`;
    return;
  }

  const [snapEmpresas, snapFacturas, snapContratos] = await Promise.all([
    getDocs(collection(db, "empresas")),
    getDocs(collection(db, "facturas")),
    getDocs(collection(db, "contratos")),
  ]);

  const empresas = [], facturas = [], contratos = [];

  snapEmpresas.forEach(d => {
    const e = d.data();
    if (
      e.nombre?.toLowerCase().includes(query) ||
      e.cuit?.toLowerCase().includes(query) ||
      e.email?.toLowerCase().includes(query)
    ) empresas.push({ id: d.id, ...e });
  });

  snapFacturas.forEach(d => {
    const f = d.data();
    if (
      f.numero?.toLowerCase().includes(query) ||
      f.empresaNombre?.toLowerCase().includes(query) ||
      f.imputacion?.toLowerCase().includes(query) ||
      f.notas?.toLowerCase().includes(query)
    ) facturas.push({ id: d.id, ...f });
  });

  snapContratos.forEach(d => {
    const c = d.data();
    if (
      c.nombre?.toLowerCase().includes(query) ||
      c.empresaNombre?.toLowerCase().includes(query) ||
      c.tipo?.toLowerCase().includes(query) ||
      c.notas?.toLowerCase().includes(query)
    ) contratos.push({ id: d.id, ...c });
  });

  if (!empresas.length && !facturas.length && !contratos.length) {
    contenedor.innerHTML = `<p class="sin-resultados">Sin resultados para "<strong>${query}</strong>"</p>`;
    return;
  }

  contenedor.innerHTML = "";

  if (empresas.length > 0) {
    contenedor.innerHTML += `<div class="resultado-seccion">🏢 Empresas</div>`;
    empresas.forEach(e => {
      const col = colorAvatar(e.nombre);
      const div = document.createElement("div");
      div.className = "resultado-item";
      div.innerHTML = `
        <div class="avatar" style="background:${col.bg};color:${col.color}">${iniciales(e.nombre)}</div>
        <div class="resultado-info">
          <div class="resultado-titulo">${e.nombre}</div>
          <div class="resultado-subtitulo">CUIT: ${e.cuit || "—"} · ${e.email || "—"}</div>
        </div>
        <span class="estado ${e.estado === "al-dia" ? "al-dia" : "pendiente"}">${e.estado === "al-dia" ? "Al día" : "Deuda"}</span>
      `;
      div.onclick = () => { cerrarBusqueda(); mostrarSeccion("empresas"); };
      contenedor.appendChild(div);
    });
  }

  if (facturas.length > 0) {
    const titulo = document.createElement("div");
    titulo.className = "resultado-seccion";
    titulo.textContent = "📄 Facturas";
    contenedor.appendChild(titulo);
    facturas.forEach(f => {
      const col = colorAvatar(f.empresaNombre || "?");
      const div = document.createElement("div");
      div.className = "resultado-item";
      div.innerHTML = `
        <div class="avatar" style="background:${col.bg};color:${col.color}">${iniciales(f.empresaNombre || "?")}</div>
        <div class="resultado-info">
          <div class="resultado-titulo">Factura ${f.numero}</div>
          <div class="resultado-subtitulo">${f.empresaNombre} · $ ${(f.monto || 0).toLocaleString("es-AR")}</div>
        </div>
        <span class="post-badge badge-${f.estado}">${f.estado}</span>
      `;
      div.onclick = () => { cerrarBusqueda(); mostrarSeccion("facturas"); };
      contenedor.appendChild(div);
    });
  }

  if (contratos.length > 0) {
    const titulo = document.createElement("div");
    titulo.className = "resultado-seccion";
    titulo.textContent = "📑 Contratos";
    contenedor.appendChild(titulo);
    contratos.forEach(c => {
      const col = colorAvatar(c.empresaNombre || "?");
      const estadoActual = calcularEstadoContrato(c.vencimiento);
      const div = document.createElement("div");
      div.className = "resultado-item";
      div.innerHTML = `
        <div class="avatar" style="background:${col.bg};color:${col.color}">${iniciales(c.empresaNombre || "?")}</div>
        <div class="resultado-info">
          <div class="resultado-titulo">${c.nombre}</div>
          <div class="resultado-subtitulo">${c.empresaNombre} · ${c.tipo || "Contrato"}</div>
        </div>
        <span class="post-badge badge-${estadoActual}">${estadoActual}</span>
      `;
      div.onclick = () => { cerrarBusqueda(); mostrarSeccion("contratos"); };
      contenedor.appendChild(div);
    });
  }
});

// ===== ESTADÍSTICAS =====
// FIX #3: destruir y recrear gráficos correctamente, con guard para canvas inexistente
let graficos = {};

async function cargarEstadisticas() {
  // Asegurarse que la sección esté activa (canvas visible) antes de dibujar
  const [snapFacturas, snapEmpresas] = await Promise.all([
    getDocs(collection(db, "facturas")),
    getDocs(collection(db, "empresas")),
  ]);

  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const colorTexto = isDark ? "#f5f5f5" : "#262626";
  const colorGrid = isDark ? "#333333" : "#dbdbdb";

  Chart.defaults.color = colorTexto;

  // Destruir gráficos anteriores
  Object.values(graficos).forEach(g => { try { g.destroy(); } catch(e) {} });
  graficos = {};

  // — Gráfico 1: Estado de facturas —
  const estados = { pendiente: 0, pagada: 0, vencida: 0, anulada: 0 };
  snapFacturas.forEach(d => {
    const estado = d.data().estado;
    if (estados[estado] !== undefined) estados[estado]++;
  });

  const canvasEstados = document.getElementById("grafico-estados");
  if (canvasEstados) {
    graficos.estados = new Chart(canvasEstados, {
      type: "doughnut",
      data: {
        labels: ["Pendiente", "Pagada", "Vencida", "Anulada"],
        datasets: [{
          data: Object.values(estados),
          backgroundColor: ["#f39c12", "#2ecc71", "#e74c3c", "#aaaaaa"],
          borderWidth: 0,
        }]
      },
      options: {
        plugins: {
          legend: { position: "bottom", labels: { padding: 16, font: { size: 12 }, color: colorTexto } }
        },
        cutout: "65%",
      }
    });
  }

  // — Gráfico 2: Monto pendiente por empresa —
  const montosPorEmpresa = {};
  snapEmpresas.forEach(d => { montosPorEmpresa[d.data().nombre] = 0; });
  snapFacturas.forEach(d => {
    const f = d.data();
    if ((f.estado === "pendiente" || f.estado === "vencida") && montosPorEmpresa[f.empresaNombre] !== undefined) {
      montosPorEmpresa[f.empresaNombre] += f.monto || 0;
    }
  });

  const empresasConDeuda = Object.entries(montosPorEmpresa).filter(([, v]) => v > 0);

  const canvasEmpresas = document.getElementById("grafico-empresas");
  if (canvasEmpresas) {
    graficos.empresas = new Chart(canvasEmpresas, {
      type: "bar",
      data: {
        labels: empresasConDeuda.map(([k]) => k),
        datasets: [{
          label: "Monto pendiente",
          data: empresasConDeuda.map(([, v]) => v),
          backgroundColor: "#0095f6",
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: colorGrid }, ticks: { font: { size: 11 }, color: colorTexto } },
          y: {
            grid: { color: colorGrid },
            ticks: {
              font: { size: 11 },
              color: colorTexto,
              callback: v => `$ ${v.toLocaleString("es-AR")}`
            }
          }
        }
      }
    });
  }

  // — Gráfico 3: Pagos por mes —
  const pagosPorMes = {};
  snapFacturas.forEach(d => {
    const f = d.data();
    if (f.estado === "pagada" && f.emision) {
      const mes = f.emision.substring(0, 7);
      pagosPorMes[mes] = (pagosPorMes[mes] || 0) + (f.monto || 0);
    }
  });

  const mesesOrdenados = Object.keys(pagosPorMes).sort();
  const labelsMeses = mesesOrdenados.map(m => {
    const [anio, mes] = m.split("-");
    const nombres = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return `${nombres[parseInt(mes) - 1]} ${anio}`;
  });

  const canvasMeses = document.getElementById("grafico-meses");
  if (canvasMeses) {
    graficos.meses = new Chart(canvasMeses, {
      type: "line",
      data: {
        labels: labelsMeses,
        datasets: [{
          label: "Pagos",
          data: mesesOrdenados.map(m => pagosPorMes[m]),
          borderColor: "#0095f6",
          backgroundColor: "rgba(0,149,246,0.1)",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#0095f6",
          pointRadius: 4,
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: colorGrid }, ticks: { font: { size: 11 }, color: colorTexto } },
          y: {
            grid: { color: colorGrid },
            ticks: {
              font: { size: 11 },
              color: colorTexto,
              callback: v => `$ ${v.toLocaleString("es-AR")}`
            }
          }
        }
      }
    });
  }
}

// ===== EXPORTAR A EXCEL =====
async function exportarExcel() {
  const [snapEmpresas, snapFacturas, snapContratos] = await Promise.all([
    getDocs(collection(db, "empresas")),
    getDocs(collection(db, "facturas")),
    getDocs(collection(db, "contratos")),
  ]);

  const wb = XLSX.utils.book_new();

  const empresasData = [["Nombre", "CUIT", "Email", "Teléfono", "Estado", "Notas"]];
  snapEmpresas.forEach(d => {
    const e = d.data();
    empresasData.push([e.nombre||"", e.cuit||"", e.email||"", e.telefono||"", e.estado==="al-dia"?"Al día":"Deuda pendiente", e.notas||""]);
  });
  const wsEmpresas = XLSX.utils.aoa_to_sheet(empresasData);
  wsEmpresas["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsEmpresas, "Empresas");

  const facturasData = [["Empresa", "N° Factura", "Fecha Emisión", "Fecha Vencimiento", "Monto", "Estado", "Imputación", "Notas"]];
  snapFacturas.forEach(d => {
    const f = d.data();
    const estadoLabel = { pendiente: "Pendiente", pagada: "Pagada", vencida: "Vencida", anulada: "Anulada" };
    facturasData.push([f.empresaNombre||"", f.numero||"", f.emision||"", f.vencimiento||"", f.monto||0, estadoLabel[f.estado]||f.estado, f.imputacion||"", f.notas||""]);
  });
  const wsFacturas = XLSX.utils.aoa_to_sheet(facturasData);
  wsFacturas["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsFacturas, "Facturas");

  const contratosData = [["Empresa", "Nombre", "Tipo", "Inicio", "Vencimiento", "Monto", "Estado", "Notas"]];
  snapContratos.forEach(d => {
    const c = d.data();
    const estadoActual = calcularEstadoContrato(c.vencimiento);
    const estadoLabel = { vigente: "Vigente", "por-vencer": "Por vencer", vencido: "Vencido" };
    contratosData.push([c.empresaNombre||"", c.nombre||"", c.tipo||"", c.inicio||"", c.vencimiento||"", c.monto||0, estadoLabel[estadoActual]||estadoActual, c.notas||""]);
  });
  const wsContratos = XLSX.utils.aoa_to_sheet(contratosData);
  wsContratos["!cols"] = [{ wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsContratos, "Contratos");

  const fecha = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `gestor-facturacion-${fecha}.xlsx`);
}

window.exportarExcel = exportarExcel;

// ===== HISTORIAL =====
// FIX #2: cargarHistorial expuesta antes de los listeners de filtros
async function cargarHistorial() {
  const lista = document.getElementById("lista-historial");
  lista.innerHTML = `<p class="texto-vacio">Cargando...</p>`;

  const filtroTipo = document.getElementById("filtro-historial-tipo").value;
  const filtroAccion = document.getElementById("filtro-historial-accion").value;

  const snapshot = await getDocs(collection(db, "historial"));

  if (snapshot.empty) {
    lista.innerHTML = `<p class="texto-vacio">No hay actividad registrada todavía.</p>`;
    return;
  }

  const logs = [];
  snapshot.forEach(d => logs.push({ id: d.id, ...d.data() }));
  logs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const iconos = { "creó": "fa-plus", "editó": "fa-pen", "eliminó": "fa-trash" };

  const filtrados = logs.filter(log => {
    if (filtroTipo && log.tipo !== filtroTipo) return false;
    if (filtroAccion && log.accion !== filtroAccion) return false;
    return true;
  });

  if (!filtrados.length) {
    lista.innerHTML = `<p class="texto-vacio">No hay actividad con ese filtro.</p>`;
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "log-wrap";

  filtrados.forEach((log, idx) => {
    const fecha = new Date(log.fecha);
    const fechaFormato = fecha.toLocaleDateString("es-AR", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });

    const item = document.createElement("div");
    item.className = "log-item";
    item.innerHTML = `
      <div class="log-icono ${log.accion}">
        <i class="fa-solid ${iconos[log.accion] || "fa-circle"}"></i>
      </div>
      <div class="log-info">
        <div class="log-descripcion">${log.descripcion}</div>
        <div class="log-fecha">${fechaFormato}</div>
      </div>
    `;
    item.style.setProperty('--i', idx);
    wrap.appendChild(item);
  });

  lista.innerHTML = "";
  lista.appendChild(wrap);

  document.getElementById("btn-limpiar-historial").classList.toggle("oculto", !modoAdmin);
}

async function limpiarHistorial() {
  if (!confirm("¿Seguro que querés borrar todo el historial? Esta acción no se puede deshacer.")) return;
  const snapshot = await getDocs(collection(db, "historial"));
  const borrados = snapshot.docs.map(d => deleteDoc(doc(db, "historial", d.id)));
  await Promise.all(borrados);
  cargarHistorial();
}

// FIX #2: los listeners de filtro ahora llaman directamente a cargarHistorial
document.getElementById("filtro-historial-tipo").addEventListener("change", cargarHistorial);
document.getElementById("filtro-historial-accion").addEventListener("change", cargarHistorial);

window.limpiarHistorial = limpiarHistorial;

// ===== PANEL DERECHO =====
function cargarRightPanel(snapEmpresas, snapFacturas, snapContratos) {
  let totalPendiente = 0, facturasPendientes = 0, contratosPorVencer = 0;
  const listaFacPend = [];
  const listaConVencer = [];

  snapFacturas.forEach(d => {
    const f = d.data();
    if (f.estado === "pendiente" || f.estado === "vencida") {
      totalPendiente += f.monto || 0;
      facturasPendientes++;
      listaFacPend.push({ id: d.id, ...f });
    }
  });

  snapContratos.forEach(d => {
    const c = d.data();
    const dias = diasRestantes(c.vencimiento);
    if (dias !== null && dias >= 0 && dias <= 30) {
      contratosPorVencer++;
      listaConVencer.push({ id: d.id, ...c, dias });
    }
  });

  document.getElementById("dash-total-pendiente").textContent = `$ ${totalPendiente.toLocaleString("es-AR")}`;

  // FIX #6: facturas pendientes clickeables
  const elFacPend = document.getElementById("dash-facturas-pendientes");
  elFacPend.textContent = facturasPendientes;
  elFacPend.style.cursor = facturasPendientes > 0 ? "pointer" : "default";
  elFacPend.onclick = facturasPendientes > 0 ? () => {
    const estadoLabel = { pendiente: "Pendiente", pagada: "Pagada", vencida: "Vencida", anulada: "Anulada" };
    const itemsHTML = listaFacPend.map(f => `
      <div class="ec-item">
        <div class="ec-item-left">
          <span class="ec-item-titulo">Factura ${f.numero}</span>
          <span class="ec-item-sub">${f.empresaNombre} · ${f.emision || "—"}</span>
        </div>
        <div class="ec-item-right">
          <span class="ec-monto">$ ${(f.monto || 0).toLocaleString("es-AR")}</span>
          <span class="post-badge badge-${f.estado}">${estadoLabel[f.estado]}</span>
        </div>
      </div>`).join("");
    mostrarListaDetalle("Facturas pendientes", itemsHTML);
  } : null;

  // FIX #6: contratos por vencer clickeables
  const elConVencer = document.getElementById("dash-contratos-vencer");
  elConVencer.textContent = contratosPorVencer;
  elConVencer.style.cursor = contratosPorVencer > 0 ? "pointer" : "default";
  elConVencer.onclick = contratosPorVencer > 0 ? () => {
    const estadoLabel = { vigente: "Vigente", "por-vencer": "Por vencer", vencido: "Vencido" };
    const itemsHTML = listaConVencer.map(c => {
      const est = calcularEstadoContrato(c.vencimiento);
      return `
      <div class="ec-item">
        <div class="ec-item-left">
          <span class="ec-item-titulo">${c.nombre}</span>
          <span class="ec-item-sub">${c.empresaNombre} · Vence en ${c.dias} día${c.dias !== 1 ? "s" : ""}</span>
        </div>
        <div class="ec-item-right">
          ${c.monto ? `<span class="ec-monto">$ ${c.monto.toLocaleString("es-AR")}</span>` : ""}
          <span class="post-badge badge-${est}">${estadoLabel[est]}</span>
        </div>
      </div>`;
    }).join("");
    mostrarListaDetalle("Contratos por vencer", itemsHTML);
  } : null;

  // Alertas panel derecho
  const rightAlertas = document.getElementById("right-alertas");
  rightAlertas.innerHTML = "";
  const alertas = [];
  snapContratos.forEach(d => {
    const c = d.data();
    const dias = diasRestantes(c.vencimiento);
    if (dias !== null && dias >= 0 && dias <= 30) alertas.push({ ...c, dias });
  });

  if (alertas.length === 0) {
    rightAlertas.innerHTML = `<p style="font-size:0.8rem;color:var(--text-secondary)">Sin alertas activas</p>`;
  } else {
    alertas.sort((a, b) => a.dias - b.dias).forEach(a => {
      const clase = a.dias <= 7 ? "alerta-7" : a.dias <= 15 ? "alerta-15" : "alerta-30";
      const div = document.createElement("div");
      div.className = `right-alerta ${clase}`;
      div.style.cursor = "pointer";
      div.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><span><strong>${a.nombre}</strong> vence en ${a.dias} día${a.dias !== 1 ? "s" : ""}</span>`;
      // FIX #7: alertas del panel derecho también clickeables
      div.addEventListener("click", () => {
        const estadoLabel = { vigente: "Vigente", "por-vencer": "Por vencer", vencido: "Vencido" };
        const est = calcularEstadoContrato(a.vencimiento);
        const itemsHTML = `
          <div class="ec-item">
            <div class="ec-item-left">
              <span class="ec-item-titulo">${a.nombre}</span>
              <span class="ec-item-sub">${a.empresaNombre} · Vence en ${a.dias} día${a.dias !== 1 ? "s" : ""}</span>
            </div>
            <div class="ec-item-right">
              ${a.monto ? `<span class="ec-monto">$ ${a.monto.toLocaleString("es-AR")}</span>` : ""}
              <span class="post-badge badge-${est}">${estadoLabel[est]}</span>
            </div>
          </div>`;
        mostrarListaDetalle("Contrato por vencer", itemsHTML);
      });
      rightAlertas.appendChild(div);
    });
  }

  // Empresas
  const rightEmpresas = document.getElementById("right-empresas");
  rightEmpresas.innerHTML = "";
  snapEmpresas.forEach(d => {
    const e = d.data();
    const col = colorAvatar(e.nombre);
    const div = document.createElement("div");
    div.className = "right-empresa";
    div.innerHTML = `
      <div class="avatar" style="width:30px;height:30px;font-size:11px;background:${col.bg};color:${col.color}">${iniciales(e.nombre)}</div>
      <div>
        <div class="right-empresa-nombre">${e.nombre}</div>
        <div class="right-empresa-estado">${e.estado === "al-dia" ? "Al día" : "Deuda pendiente"}</div>
      </div>
    `;
    rightEmpresas.appendChild(div);
  });
}

window.toggleBusqueda = toggleBusqueda;
window.cerrarBusqueda = cerrarBusqueda;
window.abrirBusqueda = abrirBusqueda;

// ===== LOADER =====
window.addEventListener("load", () => {
  setTimeout(() => {
    document.getElementById("loader-overlay").classList.add("oculto");
  }, 800);
});