/**
 * RUTA MARIJOSE JHIRE v14 FINAL
 * - Alertas Preventivas (Amarillo/Rojo)
 * - Calculadora de Vuelto
 * - Bitácora de Visitas (Check-In)
 * - Planificador Lógico
 */

// CONFIGURACIÓN GEOGRÁFICA
const LISTA_DEPARTAMENTOS = ["Guatemala", "Sacatepéquez", "Chimaltenango", "El Progreso", "Escuintla", "Santa Rosa", "Sololá", "Totonicapán", "Quetzaltenango", "Suchitepéquez", "Retalhuleu", "San Marcos", "Huehuetenango", "Quiché", "Baja Verapaz", "Alta Verapaz", "Petén", "Izabal", "Zacapa", "Chiquimula", "Jalapa", "Jutiapa"];
const MUNICIPIOS_POR_DEPARTAMENTO = {
    "Guatemala": ["Guatemala", "Mixco", "Villa Nueva", "Santa Catarina Pinula", "San Miguel Petapa", "Chinautla", "Amatitlán"],
    "Quetzaltenango": ["Quetzaltenango", "Salcajá", "Olintepeque", "Coatepeque", "San Juan Ostuncalco", "Almolonga", "Cantel", "Zunil"],
    "Escuintla": ["Escuintla", "Santa Lucía Cotzumalguapa", "Palín", "Siquinalá", "Puerto San José", "La Democracia", "Masagua"],
    "Sacatepéquez": ["Antigua Guatemala", "San Lucas", "Jocotenango", "Ciudad Vieja", "Sumpango", "Santiago"],
    // ... Agregar el resto según sea necesario
};

// BASES DE DATOS
let db = JSON.parse(localStorage.getItem('db_c_v14')) || [];
let db_ventas = JSON.parse(localStorage.getItem('db_v_v14')) || [];
let db_abonos = JSON.parse(localStorage.getItem('db_a_v14')) || [];
let db_visitas = JSON.parse(localStorage.getItem('db_vi_v14')) || []; // NUEVO: Bitácora
let ruta = JSON.parse(localStorage.getItem('db_r_v14')) || [];
let config = JSON.parse(localStorage.getItem('conf_v14')) || { nombre: "Droguería Marijose", meta: 15000, comision: 3, googleUrl: "" };

let debounceTimer;

// INICIALIZACIÓN
document.addEventListener("DOMContentLoaded", () => {
    cargarSelects();
    cargarConfigUI();
    document.getElementById('fecha-header').textContent = new Date().toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' });
    verificarAlertas();
    mostrar('view-dashboard');
});

// NAVEGACIÓN
function mostrar(id) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    if(id.includes('dashboard')) { document.getElementById('nav-home').classList.add('active'); renderDashboard(); }
    if(id.includes('agenda')) { document.getElementById('nav-agenda').classList.add('active'); renderAgenda(); }
    if(id.includes('ruta')) { document.getElementById('nav-ruta').classList.add('active'); renderRuta(); }
    if(id.includes('finanzas')) { document.getElementById('nav-finanzas').classList.add('active'); calcFinanzas(); renderVencidos(); }
    if(id.includes('reportes')) { document.getElementById('nav-rep').classList.add('active'); }
}

// ----------------------------------------------------
// 1. DASHBOARD & CRUD
// ----------------------------------------------------
function renderDashboard() {
    const list = document.getElementById('listaClientes');
    const term = document.getElementById('buscadorDashboard').value.toLowerCase();
    const tipo = document.getElementById('filtroTipo').value;
    
    let data = db.filter(c => !c.eliminado);
    if(tipo) data = data.filter(c => c.tipo === tipo);
    if(term) data = data.filter(c => c.negocio.toLowerCase().includes(term) || c.encargado.toLowerCase().includes(term));
    
    data.sort((a,b) => (a.departamento+a.negocio).localeCompare(b.departamento+b.negocio));
    document.getElementById('statTotal').textContent = data.length;
    document.getElementById('statHoy').textContent = data.filter(c => c.ultimaVisita === hoySQL()).length;
    
    list.innerHTML = '';
    if(data.length === 0) { document.getElementById('msgVacio').classList.remove('hidden'); return; }
    document.getElementById('msgVacio').classList.add('hidden');

    const hoy = new Date();
    data.forEach(c => {
        const diff = Math.floor((hoy - new Date(c.ultimaVisita || '2000-01-01')) / 86400000);
        const border = diff > 30 ? 'border-red' : (diff > 15 ? 'border-yellow' : 'border-green');
        const icon = c.tipo === 'CLINICA' ? '🩺' : '💊';
        const enRuta = ruta.includes(c.id);

        list.innerHTML += `
        <div class="card ${border}" onclick="if(!event.target.closest('button')) editarCliente(${c.id})">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="flex:1;">
                    <div style="font-size:0.7em; color:#64748b; font-weight:bold;">${icon} ${c.tipo} • ${c.departamento}</div>
                    <h3 style="margin:2px 0;">${c.negocio}</h3>
                    <div style="font-size:0.8em; color:#475569;">👤 ${c.encargado}</div>
                    <div style="font-size:0.75em; color:#94a3b8;">Hace ${diff} días</div>
                </div>
                <div style="display:flex; flex-direction:column; gap:6px; margin-left:8px;">
                    <button class="btn-icon" style="background:#25D366" onclick="abrirWhatsApp(${c.id})">💬</button>
                    <button class="btn-icon" style="background:#64748b" onclick="modalVisita(${c.id})">📍</button>
                    <button class="btn-icon" style="background:${enRuta?'#ef4444':'#cbd5e1'}" onclick="toggleRuta(${c.id})">${enRuta?'🚫':'🚚'}</button>
                    <button class="btn-icon" style="background:#0ea5e9" onclick="modalVenta(${c.id})">💰</button>
                </div>
            </div>
        </div>`;
    });
}

function nuevoCliente() { limpiarForm(); document.getElementById('tituloForm').textContent="Nuevo"; mostrar('view-form'); }
function guardarCliente() {
    const id = document.getElementById('idCliente').value;
    const n = document.getElementById('negocio').value;
    if(!n) return alert("Nombre obligatorio");
    
    const d = {
        id: id ? parseInt(id) : Date.now(),
        tipo: document.getElementById('tipoNegocio').value,
        negocio: n,
        especialidad: document.getElementById('especialidad').value,
        horario: document.getElementById('horarioVisita').value,
        departamento: document.getElementById('departamento').value,
        municipio: document.getElementById('municipio').value,
        telefono: document.getElementById('telefono').value,
        encargado: document.getElementById('encargado').value,
        dia: document.getElementById('diaVisita').value,
        lat: document.getElementById('lat').value,
        lng: document.getElementById('lng').value,
        eliminado: false,
        ultimaVisita: hoySQL()
    };
    if(id) { const i = db.findIndex(x=>x.id==id); db[i] = {...db[i], ...d}; } else { db.push(d); }
    save(); alert("Guardado"); mostrar('view-dashboard');
}
function editarCliente(id) {
    const c = db.find(x => x.id === id);
    document.getElementById('idCliente').value = c.id;
    document.getElementById('tipoNegocio').value = c.tipo || 'FARMACIA'; toggleCamposMedicos();
    document.getElementById('negocio').value = c.negocio;
    document.getElementById('especialidad').value = c.especialidad || '';
    document.getElementById('horarioVisita').value = c.horario || '';
    document.getElementById('departamento').value = c.departamento; cargarMunicipios(c.departamento);
    document.getElementById('municipio').value = c.municipio;
    document.getElementById('telefono').value = c.telefono;
    document.getElementById('encargado').value = c.encargado;
    document.getElementById('diaVisita').value = c.dia || '';
    document.getElementById('lat').value = c.lat || '';
    document.getElementById('lng').value = c.lng || '';
    document.getElementById('gpsDisplay').value = c.lat ? "GPS OK" : "Sin GPS";
    mostrar('view-form');
}

// ----------------------------------------------------
// 2. FINANZAS Y ALERTAS INTELIGENTES
// ----------------------------------------------------
function calcFinanzas() {
    const mes = new Date().getMonth();
    let cobrado = 0, credito = 0, vencido = 0;
    const hoy = new Date().toISOString().split('T')[0];

    // Calcular cobrado real (Contado + Abonos)
    db_ventas.forEach(v => {
        if(v.tipo === 'CONTADO' && new Date(v.fecha).getMonth() === mes) cobrado += v.monto;
    });
    db_abonos.forEach(a => { if(new Date(a.fecha).getMonth() === mes) cobrado += a.monto; });

    // Calcular deuda
    db_ventas.forEach(v => {
        if(v.estado === 'PENDIENTE') {
            const saldo = v.saldo !== undefined ? v.saldo : v.monto;
            if(v.vence < hoy) vencido += saldo;
            else credito += saldo;
        }
    });

    const comision = cobrado * (config.comision / 100);
    document.getElementById('finCobrado').textContent = `Q${cobrado.toFixed(2)}`;
    document.getElementById('finCredito').textContent = `Q${(credito+vencido).toFixed(2)}`;
    document.getElementById('finComision').textContent = `Q${comision.toFixed(2)}`;

    // Gráfico
    const total = cobrado + credito + vencido;
    const pCob = total > 0 ? (cobrado/total)*100 : 0;
    const pVig = total > 0 ? (credito/total)*100 : 0;
    document.getElementById('txtPorcentajeCobro').textContent = Math.round(pCob) + '%';
    document.getElementById('graficoFinanciero').style.background = `conic-gradient(var(--success) 0% ${pCob}%, var(--accent) ${pCob}% ${pCob+pVig}%, var(--danger) ${pCob+pVig}% 100%)`;
}

function verificarAlertas() {
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0];
    const limiteProx = new Date(); limiteProx.setDate(hoy.getDate() + 3);
    const limiteProxStr = limiteProx.toISOString().split('T')[0];

    const vencidos = db_ventas.filter(v => v.estado === 'PENDIENTE' && v.vence < hoyStr).length;
    const proximos = db_ventas.filter(v => v.estado === 'PENDIENTE' && v.vence >= hoyStr && v.vence <= limiteProxStr).length;

    const bRed = document.getElementById('alertaRoja');
    const bYell = document.getElementById('alertaAmarilla');

    if(vencidos > 0) { bRed.classList.remove('hidden'); document.getElementById('cantVencidos').textContent = vencidos; }
    else bRed.classList.add('hidden');

    if(proximos > 0) { bYell.classList.remove('hidden'); document.getElementById('cantProximos').textContent = proximos; }
    else bYell.classList.add('hidden');
}

function renderVencidos() {
    const hoy = new Date().toISOString().split('T')[0];
    const limiteProx = new Date(); limiteProx.setDate(new Date().getDate() + 3);
    const limiteProxStr = limiteProx.toISOString().split('T')[0];

    // VENCIDOS (ROJO)
    const listV = document.getElementById('listaVencidos'); listV.innerHTML = '';
    const dataV = db_ventas.filter(v => v.estado === 'PENDIENTE' && v.vence < hoy);
    
    if(dataV.length === 0) document.getElementById('msgSinVencidos').classList.remove('hidden');
    else {
        document.getElementById('msgSinVencidos').classList.add('hidden');
        dataV.forEach(v => {
            const c = db.find(x => x.id === v.idCliente);
            listV.innerHTML += generarCardCobro(v, c, 'border-red', 'VENCIDO');
        });
    }

    // PRÓXIMOS (AMARILLO)
    const listP = document.getElementById('listaProximos'); listP.innerHTML = '';
    const dataP = db_ventas.filter(v => v.estado === 'PENDIENTE' && v.vence >= hoy && v.vence <= limiteProxStr);
    
    if(dataP.length === 0) document.getElementById('msgSinProximos').classList.remove('hidden');
    else {
        document.getElementById('msgSinProximos').classList.add('hidden');
        dataP.forEach(v => {
            const c = db.find(x => x.id === v.idCliente);
            // Botón extra para mensaje preventivo
            listP.innerHTML += generarCardCobro(v, c, 'border-yellow', 'PRÓXIMO', true);
        });
    }
}

function generarCardCobro(v, c, borde, estado, preventivo = false) {
    let btnExtra = preventivo ? `<button class="btn-sm btn-info" onclick="wspPreventivo(${c.id}, '${v.vence}')">💬</button>` : '';
    return `
    <div class="card ${borde}" style="padding:10px; display:flex; justify-content:space-between; align-items:center;">
        <div>
            <strong>${c ? c.negocio : 'Borrado'}</strong>
            <div style="font-size:0.8em; color:#666;">Vence: ${v.vence} (${estado})</div>
        </div>
        <div style="display:flex; gap:5px;">
            ${btnExtra}
            <button class="btn-sm btn-success" onclick="modalAbono(${v.id})">Q${v.saldo}</button>
        </div>
    </div>`;
}

// ----------------------------------------------------
// 3. WHATSAPP & SPEECHES
// ----------------------------------------------------
function abrirWhatsApp(id) {
    const c = db.find(x => x.id === id);
    if(!c || !c.telefono) return alert("Sin teléfono");
    
    const titulo = (c.encargado.toLowerCase().includes('dr') || c.encargado.toLowerCase().includes('lic')) ? "" : "estimado/a";
    let msg = `Hola ${titulo} *${c.encargado}*, le saluda *${config.nombre}* de *Droguería Marijose Jhire*.%0A%0A`;
    msg += `Le escribo para consultar existencias en *${c.negocio}* y coordinar la reposición de productos de esta semana.%0A%0A`;
    msg += `Quedo a la espera de su confirmación. Saludos.`;
    
    sendWsp(c.telefono, msg);
}

function wspPreventivo(id, fecha) {
    const c = db.find(x => x.id === id);
    if(!c) return;
    let msg = `Hola *${c.encargado}*, le saluda *${config.nombre}* de *Droguería Marijose Jhire*.%0A%0A`;
    msg += `Le escribo para recordarle amablemente que su factura vence el día *${fecha}*.%0A%0A`;
    msg += `¿Paso recogiéndole el pago o prefiere depósito? Muchas gracias.`;
    sendWsp(c.telefono, msg);
}

function sendWsp(tel, msg) {
    let num = tel.replace(/\D/g, '');
    if(num.length === 8) num = "502" + num;
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
}

// ----------------------------------------------------
// 4. PLANIFICADOR DE RUTAS (LÓGICA)
// ----------------------------------------------------
function cargarRutaPorDepto() {
    const depto = document.getElementById('planDepto').value;
    if(!depto) return alert("Selecciona departamento");
    if(!confirm("¿Cargar ruta?")) return;

    let clientes = db.filter(c => c.departamento === depto && !c.eliminado);
    if(clientes.length === 0) return alert("No hay clientes");

    // Ordenar: Municipio -> Nombre
    clientes.sort((a,b) => {
        if(a.municipio === b.municipio) return a.negocio.localeCompare(b.negocio);
        return (a.municipio || "").localeCompare(b.municipio || "");
    });

    ruta = clientes.map(c => c.id);
    save(); alert("Ruta Cargada"); mostrar('view-ruta');
}

function renderAgenda() {
    const div = document.getElementById('agendaContainer'); div.innerHTML = '';
    const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    dias.forEach(d => {
        const n = db.filter(c => c.dia === d && !c.eliminado).length;
        div.innerHTML += `<div class="card" style="padding:10px; display:flex; justify-content:space-between;" onclick="loadDia('${d}')"><b>${d}</b> <span>${n} Clientes ➡️</span></div>`;
    });
}
function loadDia(d) {
    let cs = db.filter(c => c.dia === d && !c.eliminado).map(c => c.id);
    if(cs.length > 0 && confirm("¿Cargar ruta?")) { ruta = cs; save(); mostrar('view-ruta'); }
    else alert("Día vacío");
}

function renderRuta() {
    const div = document.getElementById('listaRutaContainer'); div.innerHTML = '';
    const l = db.filter(c => ruta.includes(c.id));
    document.getElementById('rutaInfo').textContent = l.length + " clientes";
    
    if(l.length === 0) { div.innerHTML = '<p class="msg-vacio">Ruta vacía</p>'; return; }

    l.forEach((c, i) => {
        const btnMap = (c.lat && c.lat !== 'MANUAL') ? `<button class="btn-sm btn-info" onclick="window.open('https://maps.google.com{c.lat},${c.lng}')">🗺️</button>` : '';
        div.innerHTML += `
        <div class="card card-ruta" style="display:flex; justify-content:space-between; align-items:center;">
            <div>
                <strong>${i+1}. ${c.negocio}</strong>
                <div style="font-size:0.8em;">${c.municipio || c.departamento}</div>
            </div>
            <div style="display:flex; gap:5px;">${btnMap} <button class="btn-sm btn-success" onclick="modalVenta(${c.id})">💰</button> <button class="btn-sm btn-danger" onclick="toggleRuta(${c.id})">X</button></div>
        </div>`;
    });
}

function optimizarRutaGPS() {
    const gps = db.filter(c => ruta.includes(c.id) && c.lat && c.lat !== 'MANUAL');
    if(gps.length < 2) return alert("Faltan GPS");
    alert("Optimizando...");
    navigator.geolocation.getCurrentPosition(p => {
        let cur = { lat: p.coords.latitude, lng: p.coords.longitude };
        let ord = []; let pend = [...gps];
        while(pend.length > 0) {
            let min = Infinity, idx = -1;
            for(let i=0; i<pend.length; i++) {
                let d = Math.sqrt(Math.pow(pend[i].lat - cur.lat, 2) + Math.pow(pend[i].lng - cur.lng, 2));
                if(d < min) { min = d; idx = i; }
            }
            ord.push(pend[idx].id);
            cur = { lat: parseFloat(pend[idx].lat), lng: parseFloat(pend[idx].lng) };
            pend.splice(idx, 1);
        }
        ruta = [...ord, ...db.filter(c => ruta.includes(c.id) && (!c.lat || c.lat === 'MANUAL')).map(c => c.id)];
        save(); renderRuta(); alert("Listo");
    });
}

// ----------------------------------------------------
// 5. MODALES (VENTA, ABONO + VUELTO, VISITA)
// ----------------------------------------------------
function modalVenta(id) { document.getElementById('ventaIdCliente').value=id; document.getElementById('modalVenta').style.display='flex'; }
function guardarVenta() {
    const id = parseInt(document.getElementById('ventaIdCliente').value);
    const m = parseFloat(document.getElementById('ventaMonto').value);
    if(!m) return;
    const v = {
        id: Date.now(), idCliente: id, fecha: hoySQL(), 
        concepto: document.getElementById('ventaConcepto').value, monto: m, saldo: m,
        tipo: document.getElementById('ventaTipo').value, estado: 'PENDIENTE',
        vence: document.getElementById('ventaVencimiento').value
    };
    if(v.tipo === 'CONTADO') { v.saldo = 0; v.estado = 'PAGADO'; }
    db_ventas.push(v);
    const c = db.find(x => x.id === id); if(c) c.ultimaVisita = hoySQL();
    save(); document.getElementById('modalVenta').style.display='none'; alert("Venta OK"); renderDashboard();
}

function modalAbono(id) {
    const v = db_ventas.find(x => x.id === id);
    document.getElementById('abonoIdVenta').value = id;
    document.getElementById('lblSaldoPendiente').textContent = `Q${v.saldo}`;
    document.getElementById('montoAbono').value = '';
    document.getElementById('pagaCon').value = '';
    document.getElementById('lblVuelto').textContent = '0.00';
    document.getElementById('modalAbono').style.display = 'flex';
}
function calcularVuelto() {
    const abono = parseFloat(document.getElementById('montoAbono').value) || 0;
    const paga = parseFloat(document.getElementById('pagaCon').value) || 0;
    document.getElementById('lblVuelto').textContent = (paga - abono).toFixed(2);
}
function guardarAbono() {
    const id = parseInt(document.getElementById('abonoIdVenta').value);
    const m = parseFloat(document.getElementById('montoAbono').value);
    const v = db_ventas.find(x => x.id === id);
    if(m > v.saldo) return alert("Monto excesivo");
    db_abonos.push({ id: Date.now(), idVenta: id, fecha: hoySQL(), monto: m });
    v.saldo -= m; if(v.saldo < 0.1) v.estado = 'PAGADO';
    save(); document.getElementById('modalAbono').style.display='none'; calcFinanzas(); renderVencidos();
}

// NUEVO: BITÁCORA DE VISITA
function modalVisita(id) { document.getElementById('visitaIdCliente').value=id; document.getElementById('modalVisita').style.display='flex'; }
function guardarVisita() {
    const id = parseInt(document.getElementById('visitaIdCliente').value);
    const visita = {
        id: Date.now(), idCliente: id, fecha: hoySQL(),
        motivo: document.getElementById('visitaMotivo').value,
        resultado: document.getElementById('visitaResultado').value,
        notas: document.getElementById('visitaNotas').value
    };
    db_visitas.push(visita);
    const c = db.find(x => x.id === id); if(c) c.ultimaVisita = hoySQL();
    save(); document.getElementById('modalVisita').style.display='none'; alert("Visita registrada"); renderDashboard();
}

// ----------------------------------------------------
// 6. UTILS & GPS
// ----------------------------------------------------
function capturarGPS() {
    const btn = event.target; const txt = document.getElementById('gpsDisplay');
    if(!navigator.geolocation) return alert("Sin GPS");
    btn.innerHTML = "⏳"; txt.value = "Calibrando (3s)...";
    setTimeout(() => {
        navigator.geolocation.getCurrentPosition(p => {
            document.getElementById('lat').value = p.coords.latitude;
            document.getElementById('lng').value = p.coords.longitude;
            txt.value = `GPS: ${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)}`;
            btn.innerHTML = "✅";
        }, e => { alert(e.message); btn.innerHTML = "📡"; }, { enableHighAccuracy: true });
    }, 3000);
}

function save() {
    localStorage.setItem('db_c_v14', JSON.stringify(db));
    localStorage.setItem('db_v_v14', JSON.stringify(db_ventas));
    localStorage.setItem('db_a_v14', JSON.stringify(db_abonos));
    localStorage.setItem('db_vi_v14', JSON.stringify(db_visitas));
    localStorage.setItem('db_r_v14', JSON.stringify(ruta));
    localStorage.setItem('conf_v14', JSON.stringify(config));
    verificarAlertas();
}
function cargarSelects() {
    const s = document.getElementById('departamento'); s.innerHTML='<option value="">-</option>';
    const p = document.getElementById('planDepto'); p.innerHTML='<option value="">Seleccione...</option>';
    LISTA_DEPARTAMENTOS.forEach(d => { s.innerHTML+=`<option>${d}</option>`; p.innerHTML+=`<option>${d}</option>`; });
    // Datalist productos
    const dl = document.getElementById('lista-productos'); dl.innerHTML='';
    (config.misProductos || ["Amoxicilina","Vitamina"]).forEach(pr => dl.innerHTML+=`<option value="${pr}">`);
}
function cargarMunicipios(d) {
    const s = document.getElementById('municipio'); s.innerHTML='';
    if(MUNICIPIOS_POR_DEPARTAMENTO[d]) MUNICIPIOS_POR_DEPARTAMENTO[d].forEach(m => s.innerHTML+=`<option>${m}</option>`);
}
function toggleCamposMedicos() { document.getElementById('camposMedicos').classList.toggle('hidden', document.getElementById('tipoNegocio').value !== 'CLINICA'); }
function toggleVencimiento() { document.getElementById('divVencimiento').classList.toggle('hidden', document.getElementById('ventaTipo').value !== 'CREDITO'); }
function toggleRuta(id) { const i = ruta.indexOf(id); if(i<0) ruta.push(id); else ruta.splice(i,1); save(); renderDashboard(); }
function limpiarForm() { document.getElementById('negocio').value=''; document.getElementById('telefono').value=''; }
function cerrarModal(id) { document.getElementById(id).style.display='none'; }
function debounceBuscar() { clearTimeout(debounceTimer); debounceTimer = setTimeout(renderDashboard, 300); }
function hoySQL() { const d = new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().split('T')[0]; }
function cargarConfigUI() {
    document.getElementById('configNombreVendedor').value = config.nombre;
    document.getElementById('configMeta').value = config.meta;
    document.getElementById('configComision').value = config.comision;
    if(document.getElementById('googleScriptUrl')) document.getElementById('googleScriptUrl').value = config.googleUrl;
}
function guardarConfiguracion() {
    config.nombre = document.getElementById('configNombreVendedor').value;
    config.meta = document.getElementById('configMeta').value;
    config.comision = document.getElementById('configComision').value;
    save(); alert("Guardado");
}
function realizarBackupManual() { const d={db, db_ventas, db_abonos, db_visitas, ruta, config}; const a=document.createElement('a'); a.href="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(d)); a.download="backup_v14.json"; document.body.appendChild(a); a.click(); a.remove(); }

// NUBE
function sincronizarDrive() {
    const url = document.getElementById('googleScriptUrl').value;
    if(!url) return alert("Falta URL");
    config.googleUrl = url; save();
    if(confirm("¿Subir?")) fetch(url, {method:"POST", mode:"no-cors", headers:{"Content-Type":"application/json"}, body:JSON.stringify({clientes:db, ventas:db_ventas})}).then(()=>alert("Enviado"));
}
function descargarDeDrive() {
    const url = document.getElementById('googleScriptUrl').value;
    if(!url) return alert("Falta URL");
    if(confirm("¿Bajar?")) fetch(url).then(r=>r.json()).then(d=>{ if(d.clientes){ db=d.clientes; save(); location.reload(); }});
}
function generarReporteDiario() {
    const h = hoySQL(); const v = db.filter(c => c.ultimaVisita === h);
    let html = `<h3>Reporte ${h}</h3><table border="1" style="width:100%"><tr><th>Negocio</th><th>Muni</th></tr>`;
    v.forEach(c => html+=`<tr><td>${c.negocio}</td><td>${c.municipio}</td></tr>`);
    document.getElementById('reporteOutput').innerHTML = html + "</table>";
    window.print();
}
function exportarExcel() {
    let csv = "Negocio,Depto,Municipio,Telefono\n";
    db.filter(c => !c.eliminado).forEach(c => csv += `"${c.negocio}",${c.departamento},${c.municipio},${c.telefono}\n`);
    const a = document.createElement('a'); a.href="data:text/csv;charset=utf-8,"+encodeURI(csv); a.download="base.csv"; document.body.appendChild(a); a.click(); a.remove();
}
