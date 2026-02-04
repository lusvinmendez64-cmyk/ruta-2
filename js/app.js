/**
 * RUTA MARIJOSE JHIRE v13.1 - SISTEMA COMPLETO
 * Visitador Médico & Control de Ventas
 */

// ==========================================
// 1. DATOS GEOGRÁFICOS
// ==========================================
const LISTA_DEPARTAMENTOS = [
    "Guatemala", "Sacatepéquez", "Chimaltenango", "El Progreso", "Escuintla", 
    "Santa Rosa", "Sololá", "Totonicapán", "Quetzaltenango", "Suchitepéquez", 
    "Retalhuleu", "San Marcos", "Huehuetenango", "Quiché", "Baja Verapaz", 
    "Alta Verapaz", "Petén", "Izabal", "Zacapa", "Chiquimula", "Jalapa", "Jutiapa"
];

const MUNICIPIOS_POR_DEPARTAMENTO = {
    "Guatemala": ["Guatemala", "Mixco", "Villa Nueva", "Santa Catarina Pinula", "San Miguel Petapa", "Chinautla", "Amatitlán", "Fraijanes"],
    "Quetzaltenango": ["Quetzaltenango", "Salcajá", "Olintepeque", "Coatepeque", "San Juan Ostuncalco", "Almolonga", "Cantel", "Zunil", "La Esperanza", "San Mateo"],
    "Escuintla": ["Escuintla", "Santa Lucía Cotzumalguapa", "Palín", "Siquinalá", "Puerto San José", "La Democracia", "Masagua"],
    "Sacatepéquez": ["Antigua Guatemala", "San Lucas", "Jocotenango", "Ciudad Vieja", "Sumpango", "Santiago", "Pastores"],
    "Chimaltenango": ["Chimaltenango", "El Tejar", "Patzicía", "Tecpán", "Patzún", "San Andrés Itzapa"],
    "San Marcos": ["San Marcos", "San Pedro Sacatepéquez", "Malacatán", "Ayutla", "Catarina", "El Tumbador"],
    "Huehuetenango": ["Huehuetenango", "Chiantla", "Malacatancito", "Cuilco", "La Democracia"],
    "Retalhuleu": ["Retalhuleu", "San Sebastián", "Champerico", "Santa Cruz Muluá"],
    "Suchitepéquez": ["Mazatenango", "Cuyotenango", "San Antonio", "Patulul"],
    "Totonicapán": ["Totonicapán", "San Cristóbal", "San Francisco El Alto", "Momostenango"],
    "Sololá": ["Sololá", "Panajachel", "Nahualá", "Santiago Atitlán", "San Lucas Tolimán"],
    "Quiché": ["Santa Cruz del Quiché", "Chichicastenango", "Joyabaj", "Nebaj"],
    "Alta Verapaz": ["Cobán", "San Pedro Carchá", "San Juan Chamelco", "San Cristóbal Verapaz"],
    "Baja Verapaz": ["Salamá", "San Jerónimo", "Purulhá"],
    "Izabal": ["Puerto Barrios", "Morales", "Livingston", "El Estor"],
    "Zacapa": ["Zacapa", "Estanzuela", "Río Hondo", "Teculután"],
    "Chiquimula": ["Chiquimula", "Esquipulas", "Jocotán", "Quezaltepeque"],
    "Jalapa": ["Jalapa", "San Pedro Pinula", "Mataquescuintla"],
    "Jutiapa": ["Jutiapa", "Asunción Mita", "Moyuta"],
    "Santa Rosa": ["Cuilapa", "Barberena", "Chiquimulilla", "Taxisco"],
    "El Progreso": ["Guastatoya", "Sanarate", "San Agustín"],
    "Petén": ["Flores", "San Benito", "Santa Elena", "Poptún", "Sayaxché"]
};

// ==========================================
// 2. ESTADO Y BASES DE DATOS
// ==========================================
let db = JSON.parse(localStorage.getItem('db_clientes_v13')) || [];
let db_ventas = JSON.parse(localStorage.getItem('db_ventas_v13')) || [];
let db_abonos = JSON.parse(localStorage.getItem('db_abonos_v13')) || [];
let ruta = JSON.parse(localStorage.getItem('db_ruta_v13')) || [];

// Configuración Persistente
let userConfig = JSON.parse(localStorage.getItem('config_marijose_v13')) || { 
    nombreVendedor: "Droguería Marijose", 
    metaMensual: 15000, 
    googleUrl: "",
    misProductos: ["Amoxicilina 500mg", "Pack Antibióticos", "Vitamina C + Zinc", "Gastrozol 20mg", "Neurobión Inyectable"] 
};

let debounceTimer;

// ==========================================
// 3. INICIALIZACIÓN
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    cargarDepartamentosEnSelects();
    cargarConfiguracionUI();
    document.getElementById('fecha-header').textContent = new Date().toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' });
    
    // Verificar vencimientos al arrancar
    verificarFacturasVencidas();
    
    // Vista inicial
    mostrar('view-dashboard');
});

// ==========================================
// 4. NAVEGACIÓN
// ==========================================
function mostrar(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    if(viewId.includes('dashboard')) { 
        document.getElementById('nav-home').classList.add('active'); 
        renderDashboard(); 
    }
    if(viewId.includes('agenda')) { 
        document.getElementById('nav-agenda').classList.add('active'); 
        renderAgenda(); 
    }
    if(viewId.includes('ruta')) { 
        document.getElementById('nav-ruta').classList.add('active'); 
        renderRuta(); 
    }
    if(viewId.includes('finanzas')) { 
        document.getElementById('nav-finanzas').classList.add('active'); 
        actualizarGraficoFinanciero(); 
        renderVencidos(); 
    }
    if(viewId.includes('reportes')) { 
        document.getElementById('nav-rep').classList.add('active'); 
    }
}

// ==========================================
// 5. DASHBOARD & CRUD CLIENTES
// ==========================================
function renderDashboard() {
    const list = document.getElementById('listaClientes');
    const term = document.getElementById('buscadorDashboard').value.toLowerCase();
    const tipo = document.getElementById('filtroTipo').value;
    
    let data = db.filter(c => !c.eliminado);
    if(tipo) data = data.filter(c => c.tipo === tipo);
    if(term) data = data.filter(c => 
        (c.negocio && c.negocio.toLowerCase().includes(term)) || 
        (c.encargado && c.encargado.toLowerCase().includes(term))
    );
    
    data.sort((a,b) => (a.departamento+a.negocio).localeCompare(b.departamento+b.negocio));
    
    document.getElementById('statTotal').textContent = data.length;
    document.getElementById('statHoy').textContent = data.filter(c => c.ultimaVisita === obtenerFechaLocal()).length;
    
    list.innerHTML = '';
    if(data.length===0) { document.getElementById('msgVacio').classList.remove('hidden'); return; }
    document.getElementById('msgVacio').classList.add('hidden');

    const hoy = new Date();
    data.forEach(c => {
        // Icono
        const icon = c.tipo === 'CLINICA' ? '🩺' : (c.tipo === 'FARMACIA' ? '💊' : '🏪');
        // Mapa de calor
        const ultima = new Date(c.ultimaVisita || '2000-01-01');
        const diff = Math.floor((hoy - ultima) / (1000 * 60 * 60 * 24));
        const borde = diff > 30 ? 'border-red' : (diff > 15 ? 'border-yellow' : 'border-green');
        const enRuta = ruta.includes(c.id);

        list.innerHTML += `
        <div class="card ${borde}" onclick="if(!event.target.closest('button')) editarCliente(${c.id})">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="flex:1;">
                    <div style="font-size:0.7em; color:#64748b; font-weight:bold;">${icon} ${c.tipo || 'GENERAL'} • ${c.departamento}</div>
                    <h3 style="margin:5px 0; border:none; padding:0;">${c.negocio}</h3>
                    <div style="font-size:0.85em; color:#475569;">👤 ${c.encargado || 'S/N'}</div>
                    <div style="font-size:0.75em; color:#94a3b8;">Hace ${diff} días</div>
                </div>
                <div style="display:flex; flex-direction:column; gap:8px; margin-left:10px;">
                    <button class="btn-icon" style="background:#25D366" onclick="abrirWhatsApp(${c.id})">💬</button>
                    <button class="btn-icon" style="background:${enRuta?'#ef4444':'#cbd5e1'}" onclick="toggleRuta(${c.id})">${enRuta?'🚫':'🚚'}</button>
                    <button class="btn-icon btn-info" onclick="abrirModalVenta(${c.id}, '${c.negocio}')">💰</button>
                </div>
            </div>
        </div>`;
    });
}

function nuevoCliente() { limpiarForm(); document.getElementById('tituloForm').textContent="Nuevo"; mostrar('view-form'); }

function editarCliente(id) {
    const c = db.find(x => x.id === id);
    document.getElementById('idCliente').value = c.id;
    document.getElementById('tipoNegocio').value = c.tipo || 'FARMACIA';
    toggleCamposMedicos();
    document.getElementById('negocio').value = c.negocio;
    document.getElementById('especialidad').value = c.especialidad || '';
    document.getElementById('horarioVisita').value = c.horario || '';
    document.getElementById('departamento').value = c.departamento;
    cargarMunicipios(c.departamento);
    document.getElementById('municipio').value = c.municipio;
    document.getElementById('direccion').value = c.direccion;
    document.getElementById('telefono').value = c.telefono;
    document.getElementById('encargado').value = c.encargado;
    document.getElementById('diaVisita').value = c.diaPreferido || '';
    document.getElementById('lat').value = c.lat || '';
    document.getElementById('lng').value = c.lng || '';
    document.getElementById('gpsDisplay').value = c.lat ? `${parseFloat(c.lat).toFixed(4)}, ${parseFloat(c.lng).toFixed(4)}` : "Sin GPS";
    mostrar('view-form');
}

function guardarCliente() {
    const id = document.getElementById('idCliente').value;
    const n = document.getElementById('negocio').value;
    if(!n) { alert("Nombre requerido"); return; }
    
    const d = {
        id: id ? parseInt(id) : Date.now(),
        tipo: document.getElementById('tipoNegocio').value,
        negocio: n,
        especialidad: document.getElementById('especialidad').value,
        horario: document.getElementById('horarioVisita').value,
        departamento: document.getElementById('departamento').value,
        municipio: document.getElementById('municipio').value,
        direccion: document.getElementById('direccion').value,
        telefono: document.getElementById('telefono').value,
        encargado: document.getElementById('encargado').value,
        diaPreferido: document.getElementById('diaVisita').value,
        lat: document.getElementById('lat').value,
        lng: document.getElementById('lng').value,
        eliminado: false,
        ultimaVisita: obtenerFechaLocal()
    };
    
    if(id) { const i = db.findIndex(x=>x.id==id); db[i] = {...db[i], ...d}; } else { db.push(d); }
    guardarDB(); alert("Guardado"); mostrar('view-dashboard');
}

function capturarGPSAltaPrecision() {
    const btn = event.target;
    const txt = document.getElementById('gpsDisplay');
    if(!navigator.geolocation) { alert("Sin GPS"); return; }
    
    btn.innerHTML = "⏳"; txt.value = "Calibrando (3s)...";
    // Delay de 3 segundos para mejorar precisión
    setTimeout(() => {
        navigator.geolocation.getCurrentPosition(p => {
            document.getElementById('lat').value = p.coords.latitude;
            document.getElementById('lng').value = p.coords.longitude;
            txt.value = `${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)} (±${Math.round(p.coords.accuracy)}m)`;
            btn.innerHTML = "✅";
        }, e => { alert(e.message); btn.innerHTML = "📡"; txt.value = "Error"; }, 
        { enableHighAccuracy: true });
    }, 3000);
}

// ==========================================
// 6. WHATSAPP SPEECH (MEJORADO)
// ==========================================
function abrirWhatsApp(id) {
    const c = db.find(x => x.id === id);
    if(!c || !c.telefono) { alert("Sin teléfono"); return; }
    
    const vendedor = userConfig.nombreVendedor;
    const encargado = c.encargado || "Encargado";
    const negocio = c.negocio;
    
    let titulo = "estimado/a";
    if(encargado.toLowerCase().includes("dr")) titulo = "";
    if(encargado.toLowerCase().includes("lic")) titulo = "";

    // PLANTILLA ESPECÍFICA MARIJOSE JHIRE
    let msg = `Hola ${titulo} *${encargado}*, le saluda *${vendedor}* de *Droguería Marijose Jhire*.%0A%0A`;
    msg += `Le escribo para consultar existencias en *${negocio}* y coordinar la reposición de productos de esta semana.%0A%0A`;
    msg += `Quedo a la espera de su confirmación. Saludos.`;

    let num = c.telefono.replace(/\D/g,'');
    if(num.length === 8) num = "502" + num;
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
}

// ==========================================
// 7. PLANIFICACIÓN DE RUTA (LÓGICA)
// ==========================================

// CARGAR POR DEPARTAMENTO (Con ordenamiento lógico por municipio)
function cargarRutaPorDepto() {
    const depto = document.getElementById('planDepto').value;
    if(!depto) { alert("Selecciona departamento"); return; }
    
    if(!confirm(`¿Cargar ruta de ${depto}? Reemplazará la actual.`)) return;
    
    let clientes = db.filter(c => c.departamento === depto && !c.eliminado);
    if(clientes.length === 0) { alert("No hay clientes"); return; }
    
    // ORDENAR: Primero por Municipio, luego por Negocio (Agrupación Lógica)
    clientes.sort((a,b) => {
        if(a.municipio === b.municipio) return a.negocio.localeCompare(b.negocio);
        return (a.municipio || "").localeCompare(b.municipio || "");
    });
    
    ruta = clientes.map(c => c.id);
    guardarDB();
    alert(`✅ Ruta cargada con ${ruta.length} clientes de ${depto} (Ordenados por Municipio).`);
    mostrar('view-ruta');
}

// AGENDA SEMANAL
function renderAgenda() {
    const div = document.getElementById('agendaContainer');
    const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    div.innerHTML = '';
    
    dias.forEach(dia => {
        const clientes = db.filter(c => c.diaPreferido === dia && !c.eliminado);
        const farm = clientes.filter(c => c.tipo === 'FARMACIA').length;
        const clin = clientes.filter(c => c.tipo === 'CLINICA').length;
        
        div.innerHTML += `
        <div class="agenda-day-card" onclick="cargarRutaDia('${dia}')" style="cursor:pointer; background:white; padding:15px; border-radius:10px; margin-bottom:10px; border:1px solid #e0e7ff; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <div style="font-weight:bold; color:#4338ca;">${dia}</div>
                <div style="font-size:0.8em; color:#6b7280;">${clientes.length} Clientes (💊${farm} 🩺${clin})</div>
            </div>
            <button class="btn-icon" style="background:#eef2ff; color:#4338ca;">➡️</button>
        </div>`;
    });
}

function cargarRutaDia(dia) {
    const clientes = db.filter(c => c.diaPreferido === dia && !c.eliminado);
    if(clientes.length === 0) { alert("Día vacío"); return; }
    if(confirm(`¿Cargar ruta del ${dia}?`)) {
        ruta = clientes.map(c => c.id);
        guardarDB(); mostrar('view-ruta');
    }
}

// RUTA ACTIVA
function renderRuta() {
    const div = document.getElementById('listaRutaContainer');
    const info = document.getElementById('rutaInfo');
    const lista = db.filter(c => ruta.includes(c.id));
    
    info.textContent = `${lista.length} clientes`;
    div.innerHTML = '';
    
    if(lista.length === 0) { div.innerHTML = '<p class="msg-vacio">Ruta vacía</p>'; return; }
    
    lista.forEach((c, idx) => {
        const url = (c.lat && c.lat !== 'MANUAL') ? `https://www.google.com/maps/dir/0{c.lat},${c.lng}` : '';
        const btnMap = url ? `<button class="btn btn-sm btn-info" onclick="window.open('${url}')">🗺️</button>` : '';
        
        div.innerHTML += `
        <div class="card card-ruta" style="display:flex; justify-content:space-between; align-items:center;">
            <div>
                <strong style="font-size:1.1em;">${idx+1}. ${c.negocio}</strong>
                <div style="font-size:0.8em; color:#555;">${c.municipio || c.departamento}</div>
            </div>
            <div style="display:flex; gap:5px;">
                ${btnMap}
                <button class="btn btn-sm btn-success" onclick="abrirModalVenta(${c.id}, '${c.negocio}')">💰</button>
                <button class="btn btn-sm btn-danger" onclick="quitarDeRuta(${c.id})">✕</button>
            </div>
        </div>`;
    });
}

function quitarDeRuta(id) {
    const i = ruta.indexOf(id); if(i>-1) ruta.splice(i,1); guardarDB(); renderRuta();
}
function limpiarRuta() { if(confirm("¿Vaciar?")) { ruta = []; guardarDB(); renderRuta(); } }

function optimizarRutaGPS() {
    const clientesGPS = db.filter(c => ruta.includes(c.id) && c.lat && c.lat !== 'MANUAL');
    if(clientesGPS.length < 2) { alert("Faltan clientes con GPS"); return; }
    
    alert("Calculando...");
    navigator.geolocation.getCurrentPosition(pos => {
        let curr = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        let ordered = [];
        let pending = [...clientesGPS];
        
        while(pending.length > 0) {
            let nearest = null; let minD = Infinity; let idx = -1;
            for(let i=0; i<pending.length; i++) {
                const d = Math.sqrt(Math.pow(pending[i].lat - curr.lat, 2) + Math.pow(pending[i].lng - curr.lng, 2));
                if(d < minD) { minD = d; nearest = pending[i]; idx = i; }
            }
            if(nearest) {
                ordered.push(nearest.id);
                curr = { lat: parseFloat(nearest.lat), lng: parseFloat(nearest.lng) };
                pending.splice(idx, 1);
            }
        }
        const noGPS = db.filter(c => ruta.includes(c.id) && (!c.lat || c.lat === 'MANUAL')).map(c => c.id);
        ruta = [...ordered, ...noGPS];
        guardarDB(); renderRuta(); alert("Ruta optimizada");
    });
}

function abrirMapaRuta() {
    if(ruta.length === 0) return;
    // Abrir primer cliente
    const c = db.find(x => x.id === ruta[0]);
    if(c && c.lat) window.open(`https://www.google.com/maps/dir/1{c.lat},${c.lng}`);
    else alert("Primer cliente sin GPS");
}

// ==========================================
// 8. FINANZAS Y CRONOGRAMA DE PAGOS
// ==========================================
function actualizarGraficoFinanciero() {
    const mes = new Date().getMonth();
    const hoy = new Date();
    let cobrado = 0, vigente = 0, vencido = 0;

    db_ventas.forEach(v => {
        let saldo = v.saldoPendiente !== undefined ? v.saldoPendiente : v.monto;
        if(v.tipo === 'CONTADO' && new Date(v.fechaVenta).getMonth() === mes) cobrado += v.monto;
        if(v.estado === 'PENDIENTE') {
            if(new Date(v.fechaVencimiento) < hoy) vencido += saldo;
            else vigente += saldo;
        }
    });
    db_abonos.forEach(a => { if(new Date(a.fecha).getMonth() === mes) cobrado += a.monto; });

    document.getElementById('finCobrado').textContent = `Q${cobrado.toFixed(2)}`;
    document.getElementById('finCredito').textContent = `Q${(vigente+vencido).toFixed(2)}`;

    const total = cobrado + vigente + vencido;
    const pCob = total > 0 ? (cobrado/total)*100 : 0;
    const pVig = total > 0 ? (vigente/total)*100 : 0;
    
    document.getElementById('txtPorcentajeCobro').textContent = Math.round(pCob) + '%';
    document.getElementById('graficoFinanciero').style.background = 
        `conic-gradient(var(--success) 0% ${pCob}%, var(--accent) ${pCob}% ${pCob+pVig}%, var(--danger) ${pCob+pVig}% 100%)`;
}

function verificarFacturasVencidas() {
    const hoy = new Date().toISOString().split('T')[0];
    const n = db_ventas.filter(v => v.estado === 'PENDIENTE' && v.fechaVencimiento < hoy).length;
    const b = document.getElementById('alertaCobros');
    if(n > 0) { b.classList.remove('hidden'); document.getElementById('cantVencidas').textContent = n; }
    else b.classList.add('hidden');
}

function renderVencidos() {
    const list = document.getElementById('listaVencidos');
    const hoy = new Date().toISOString().split('T')[0];
    const data = db_ventas.filter(v => v.estado === 'PENDIENTE' && v.fechaVencimiento < hoy);
    list.innerHTML = '';
    
    if(data.length === 0) { document.getElementById('msgSinVencidos').classList.remove('hidden'); return; }
    document.getElementById('msgSinVencidos').classList.add('hidden');

    data.forEach(v => {
        const c = db.find(x => x.id === v.idCliente);
        list.innerHTML += `<div class="card" style="padding:10px; border-left:4px solid red; display:flex; justify-content:space-between;"><div><strong>${c?c.negocio:'Borrado'}</strong><br><small>Venció: ${v.fechaVencimiento}</small></div><button class="btn btn-sm btn-success" onclick="abrirModalAbono(${v.id})">Cobrar Q${v.saldoPendiente}</button></div>`;
    });
}

// ==========================================
// 9. MODALES DE VENTA Y ABONO
// ==========================================
function abrirModalVenta(id, n) { 
    document.getElementById('ventaIdCliente').value=id; 
    document.getElementById('modalVenta').style.display='flex';
    // Llenar datalist
    const dl = document.getElementById('lista-productos'); dl.innerHTML='';
    userConfig.misProductos.forEach(p => dl.innerHTML += `<option value="${p}">`);
}
function guardarVenta() {
    const id = parseInt(document.getElementById('ventaIdCliente').value);
    const m = parseFloat(document.getElementById('ventaMonto').value);
    if(!m) return;
    const v = {
        id: Date.now(), idCliente:id, fechaVenta:obtenerFechaLocal(), 
        concepto:document.getElementById('ventaConcepto').value, monto:m, saldoPendiente:m, 
        tipo:document.getElementById('ventaTipo').value, estado:'PENDIENTE', 
        fechaVencimiento:document.getElementById('ventaVencimiento').value
    };
    if(v.tipo==='CONTADO') { v.saldoPendiente=0; v.estado='PAGADO'; }
    db_ventas.push(v);
    const c = db.find(x=>x.id==id); if(c) c.ultimaVisita=obtenerFechaLocal();
    guardarDB(); document.getElementById('modalVenta').style.display='none'; alert("Venta OK"); renderDashboard();
}
function toggleVencimiento() { 
    document.getElementById('divVencimiento').classList.toggle('hidden', document.getElementById('ventaTipo').value !== 'CREDITO'); 
}

function abrirModalAbono(id) { 
    const v = db_ventas.find(x => x.id === id);
    document.getElementById('abonoIdVenta').value=id; 
    document.getElementById('lblSaldoPendiente').textContent = `Q${v.saldoPendiente.toFixed(2)}`;
    document.getElementById('modalAbono').style.display='flex'; 
}
function guardarAbono() {
    const idV = parseInt(document.getElementById('abonoIdVenta').value);
    const m = parseFloat(document.getElementById('montoAbono').value);
    const v = db_ventas.find(x=>x.id==idV);
    if(m > v.saldoPendiente) { alert("Excesivo"); return; }
    db_abonos.push({id:Date.now(), idVenta:idV, fecha:obtenerFechaLocal(), monto:m});
    v.saldoPendiente -= m;
    if(v.saldoPendiente < 0.1) v.estado='PAGADO';
    guardarDB(); document.getElementById('modalAbono').style.display='none'; mostrar('view-finanzas');
}

// ==========================================
// 10. UTILIDADES Y NUBE
// ==========================================
function guardarConfiguracion() {
    userConfig.nombreVendedor = document.getElementById('configNombreVendedor').value;
    userConfig.metaMensual = parseFloat(document.getElementById('configMeta').value);
    guardarDB();
}
function cargarConfiguracionUI() {
    document.getElementById('configNombreVendedor').value = userConfig.nombreVendedor;
    document.getElementById('configMeta').value = userConfig.metaMensual;
    if(document.getElementById('googleScriptUrl')) document.getElementById('googleScriptUrl').value = userConfig.googleUrl;
}
function cargarDepartamentosEnSelects() {
    const s = document.getElementById('departamento'); s.innerHTML='<option value="">-</option>';
    const p = document.getElementById('planDepto'); p.innerHTML='<option value="">Seleccione...</option>';
    LISTA_DEPARTAMENTOS.forEach(d => {
        s.innerHTML += `<option>${d}</option>`;
        p.innerHTML += `<option>${d}</option>`;
    });
}
function cargarMunicipios(d) {
    const s = document.getElementById('municipio'); s.innerHTML='';
    if(MUNICIPIOS_POR_DEPARTAMENTO[d]) MUNICIPIOS_POR_DEPARTAMENTO[d].forEach(m=>s.innerHTML+=`<option>${m}</option>`);
}
function toggleCamposMedicos() {
    document.getElementById('camposMedicos').classList.toggle('hidden', document.getElementById('tipoNegocio').value !== 'CLINICA');
}
function toggleRuta(id) { const i=ruta.indexOf(id); if(i<0) ruta.push(id); else ruta.splice(i,1); guardarDB(); renderDashboard(); }
function limpiarForm() { document.getElementById('negocio').value=''; document.getElementById('telefono').value=''; }
function cerrarModal(id) { document.getElementById(id).style.display='none'; }
function debounceBuscar() { clearTimeout(debounceTimer); debounceTimer = setTimeout(renderDashboard, 300); }
function obtenerFechaLocal() { const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().split('T')[0]; }
function guardarDB() { 
    localStorage.setItem('db_clientes_v13', JSON.stringify(db)); 
    localStorage.setItem('db_ventas_v13', JSON.stringify(db_ventas)); 
    localStorage.setItem('db_abonos_v13', JSON.stringify(db_abonos)); 
    localStorage.setItem('db_ruta_v13', JSON.stringify(ruta));
    localStorage.setItem('config_marijose_v13', JSON.stringify(userConfig));
}
function realizarBackupManual() { const d={db, db_ventas, db_abonos, ruta, userConfig}; const a=document.createElement('a'); a.href="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(d)); a.download="backup.json"; document.body.appendChild(a); a.click(); a.remove(); }

// NUBE
function sincronizarDrive() {
    const url = document.getElementById('googleScriptUrl').value;
    if(!url) return alert("Falta URL");
    userConfig.googleUrl = url; guardarDB();
    if(confirm("¿Subir?")) fetch(url, {method:"POST", mode:"no-cors", headers:{"Content-Type":"application/json"}, body:JSON.stringify({clientes:db, ventas:db_ventas})}).then(()=>alert("Enviado"));
}
function descargarDeDrive() {
    const url = document.getElementById('googleScriptUrl').value;
    if(!url) return alert("Falta URL");
    if(confirm("¿Descargar?")) fetch(url).then(r=>r.json()).then(d=>{ if(d.clientes){ db=d.clientes; guardarDB(); location.reload(); }});
}
function generarReporteDiario() {
    const h = obtenerFechaLocal(); const v = db.filter(c=>c.ultimaVisita===h);
    let html = `<h3 style="text-align:center">Reporte ${h}</h3><table border="1" style="width:100%; border-collapse:collapse;"><tr><th>Cliente</th><th>Tipo</th><th>Tel</th></tr>`;
    v.forEach(c=>html+=`<tr><td>${c.negocio}</td><td>${c.tipo}</td><td>${c.telefono}</td></tr>`);
    html+=`</table>`;
    document.getElementById('reporteOutput').innerHTML=html; window.print();
}
function exportarExcel() {
    let csv = "Negocio,Tipo,Depto,Municipio,Telefono,Encargado\n";
    db.filter(c=>!c.eliminado).forEach(c=>csv+=`"${c.negocio}",${c.tipo},${c.departamento},${c.municipio},${c.telefono},"${c.encargado}"\n`);
    const a = document.createElement('a'); a.href="data:text/csv;charset=utf-8,"+encodeURI(csv); a.download="clientes.csv"; document.body.appendChild(a); a.click(); a.remove();
}
