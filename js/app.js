/**
 * RUTA MARIJOSE V14 FINAL - Lógica Blindada
 * - Safety Checks en GPS y Ruta
 * - Limpieza automática de datos fantasma
 */

const DEPTOS = ["Guatemala", "Sacatepéquez", "Chimaltenango", "El Progreso", "Escuintla", "Santa Rosa", "Sololá", "Totonicapán", "Quetzaltenango", "Suchitepéquez", "Retalhuleu", "San Marcos", "Huehuetenango", "Quiché", "Baja Verapaz", "Alta Verapaz", "Petén", "Izabal", "Zacapa", "Chiquimula", "Jalapa", "Jutiapa"];
const MUNIS = {
    "Guatemala": ["Guatemala", "Mixco", "Villa Nueva", "Pinula", "Petapa", "Chinautla", "Amatitlán"],
    "Quetzaltenango": ["Xela", "Salcajá", "Olintepeque", "Coatepeque", "San Juan", "Almolonga", "Cantel", "Zunil"],
    "Escuintla": ["Escuintla", "Santa Lucía", "Palín", "Siquinalá", "Puerto San José"],
    "Sacatepéquez": ["Antigua", "San Lucas", "Jocotenango", "Ciudad Vieja", "Sumpango", "Santiago"],
    "San Marcos": ["San Marcos", "San Pedro", "Malacatán", "Ayutla"],
    "Huehuetenango": ["Huehue", "Chiantla", "Malacatancito", "Cuilco"],
    "Retalhuleu": ["Reu", "San Sebastián", "Champerico"],
    "Suchitepéquez": ["Mazate", "Cuyotenango", "San Antonio"],
    "Totonicapán": ["Toto", "San Cristóbal", "San Francisco"],
    "Sololá": ["Sololá", "Panajachel", "Nahualá", "San Lucas"],
    "Quiché": ["Santa Cruz", "Chichi", "Joyabaj"],
    "Alta Verapaz": ["Cobán", "Carchá", "Chamelco"],
    "Baja Verapaz": ["Salamá", "San Jerónimo"],
    "Izabal": ["Puerto Barrios", "Morales", "Livingston"],
    "Zacapa": ["Zacapa", "Estanzuela", "Río Hondo"],
    "Chiquimula": ["Chiquimula", "Esquipulas", "Jocotán"],
    "Jalapa": ["Jalapa", "San Pedro Pinula"],
    "Jutiapa": ["Jutiapa", "Mita", "Moyuta"],
    "Santa Rosa": ["Cuilapa", "Barberena", "Taxisco"],
    "El Progreso": ["Guastatoya", "Sanarate"],
    "Petén": ["Flores", "San Benito", "Santa Elena", "Poptún"]
};

// Bases de datos (Nuevos Keys v14)
let db = JSON.parse(localStorage.getItem('db_c_v14')) || [];
let ventas = JSON.parse(localStorage.getItem('db_v_v14')) || [];
let abonos = JSON.parse(localStorage.getItem('db_a_v14')) || [];
let visitas = JSON.parse(localStorage.getItem('db_vi_v14')) || [];
let ruta = JSON.parse(localStorage.getItem('db_r_v14')) || [];
let conf = JSON.parse(localStorage.getItem('conf_v14')) || { nombre: "Visitador", meta: 15000, comision: 3, googleUrl: "" };
let timer;

document.addEventListener("DOMContentLoaded", () => {
    limpiarRutaFantasma(); // AUTO-FIX: Limpia ruta al iniciar
    llenarSelects();
    cargarConf();
    document.getElementById('fecha-header').textContent = new Date().toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' });
    checkAlertas();
    mostrar('view-dashboard');
});

// --- CORE ---
function mostrar(id) {
    document.querySelectorAll('.view-section').forEach(e => e.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if(id.includes('dashboard')) { document.getElementById('nav-home').classList.add('active'); renderDash(); }
    if(id.includes('agenda')) { document.getElementById('nav-agenda').classList.add('active'); renderAgenda(); }
    if(id.includes('ruta')) { document.getElementById('nav-ruta').classList.add('active'); renderRuta(); }
    if(id.includes('finanzas')) { document.getElementById('nav-finanzas').classList.add('active'); calcFinanzas(); renderAlertas(); }
    if(id.includes('reportes')) { document.getElementById('nav-rep').classList.add('active'); }
}

// --- DASHBOARD ---
function renderDash() {
    const list = document.getElementById('listaClientes');
    const term = document.getElementById('buscador').value.toLowerCase();
    const tip = document.getElementById('filtroTipo').value;
    
    let d = db.filter(c => !c.eliminado);
    if(tip) d = d.filter(c => c.tipo === tip);
    if(term) d = d.filter(c => c.negocio.toLowerCase().includes(term) || c.encargado.toLowerCase().includes(term));
    
    d.sort((a,b) => (a.depto+a.negocio).localeCompare(b.depto+b.negocio));
    document.getElementById('statTotal').textContent = d.length;
    document.getElementById('statHoy').textContent = d.filter(c => c.ultimaVisita === hoySQL()).length;
    
    list.innerHTML = '';
    if(d.length === 0) { document.getElementById('msgVacio').classList.remove('hidden'); return; }
    document.getElementById('msgVacio').classList.add('hidden');

    const hoy = new Date();
    d.forEach(c => {
        const diff = Math.floor((hoy - new Date(c.ultimaVisita || '2000-01-01')) / 86400000);
        const col = diff > 30 ? 'border-red' : (diff > 15 ? 'border-yellow' : 'border-green');
        const ico = c.tipo === 'CLINICA' ? '🩺' : (c.tipo === 'FARMACIA' ? '💊' : '📦');
        const enRuta = ruta.includes(c.id);

        list.innerHTML += `
        <div class="card ${col}" onclick="if(!event.target.closest('button')) editar(${c.id})">
            <div style="display:flex; justify-content:space-between;">
                <div style="flex:1">
                    <div style="font-size:0.7em; color:#666; font-weight:bold;">${ico} ${c.tipo} • ${c.depto}</div>
                    <h3 style="margin:2px 0;">${c.negocio}</h3>
                    <div style="font-size:0.8em; color:#444;">👤 ${c.encargado}</div>
                    <div style="font-size:0.75em; color:#888;">Hace ${diff} días</div>
                </div>
                <div style="display:flex; flex-direction:column; gap:6px;">
                    <button class="btn-icon" style="background:#25D366" onclick="wsp(${c.id})">💬</button>
                    <button class="btn-icon" style="background:#64748b" onclick="modalVisita(${c.id})">📍</button>
                    <button class="btn-icon" style="background:${enRuta?'#ef4444':'#cbd5e1'}" onclick="toggRuta(${c.id})">${enRuta?'🚫':'🚚'}</button>
                    <button class="btn-icon" style="background:#0ea5e9" onclick="modalVenta(${c.id})">💰</button>
                </div>
            </div>
        </div>`;
    });
}

// --- CRUD ---
function nuevoCliente() { limpiar(); document.getElementById('tituloForm').textContent="Nuevo"; mostrar('view-form'); }
function guardarCliente() {
    const id = document.getElementById('idCliente').value;
    const n = document.getElementById('negocio').value;
    if(!n) return alert("Nombre obligatorio");
    
    const obj = {
        id: id ? parseInt(id) : Date.now(),
        tipo: document.getElementById('tipoNegocio').value,
        negocio: n,
        especialidad: document.getElementById('especialidad').value,
        horario: document.getElementById('horario').value,
        depto: document.getElementById('departamento').value,
        muni: document.getElementById('municipio').value,
        tel: document.getElementById('telefono').value,
        encargado: document.getElementById('encargado').value,
        dia: document.getElementById('diaVisita').value,
        lat: document.getElementById('lat').value,
        lng: document.getElementById('lng').value,
        eliminado: false,
        ultimaVisita: hoySQL()
    };
    if(id) { const i = db.findIndex(x => x.id == id); db[i] = {...db[i], ...obj}; } else { db.push(obj); }
    save(); alert("Guardado"); mostrar('view-dashboard');
}
function editar(id) {
    const c = db.find(x => x.id === id);
    document.getElementById('idCliente').value = c.id;
    document.getElementById('tipoNegocio').value = c.tipo || 'FARMACIA'; toggleMedicos();
    document.getElementById('negocio').value = c.negocio;
    document.getElementById('especialidad').value = c.especialidad || '';
    document.getElementById('horario').value = c.horario || '';
    document.getElementById('departamento').value = c.depto; cargarMuni(c.depto);
    document.getElementById('municipio').value = c.muni;
    document.getElementById('telefono').value = c.tel;
    document.getElementById('encargado').value = c.encargado;
    document.getElementById('diaVisita').value = c.dia;
    document.getElementById('lat').value = c.lat || '';
    document.getElementById('lng').value = c.lng || '';
    document.getElementById('gpsTxt').value = (c.lat && c.lat !== "MANUAL") ? "GPS OK" : "Sin Datos";
    mostrar('view-form');
}

// --- GPS SAFE ---
function capturarGPS() {
    const b = event.target; const t = document.getElementById('gpsTxt');
    if(!navigator.geolocation) return alert("Sin GPS");
    b.innerHTML = "⏳"; t.value = "Calibrando (3s)...";
    setTimeout(() => {
        navigator.geolocation.getCurrentPosition(p => {
            document.getElementById('lat').value = p.coords.latitude;
            document.getElementById('lng').value = p.coords.longitude;
            t.value = `GPS: ${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)}`;
            b.innerHTML = "✅";
        }, e => { alert(e.message); b.innerHTML = "📡"; }, { enableHighAccuracy: true });
    }, 3000);
}

// --- RUTA Y AGENDA ---
function renderAgenda() {
    const div = document.getElementById('agendaContainer'); div.innerHTML = '';
    ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"].forEach(d => {
        const n = db.filter(c => c.dia === d && !c.eliminado).length;
        div.innerHTML += `<div class="card" style="padding:10px; display:flex; justify-content:space-between;" onclick="loadDia('${d}')"><b>${d}</b> <span>${n} Clientes ➡️</span></div>`;
    });
}
function cargarRutaDepto() {
    const dp = document.getElementById('planDepto').value; if(!dp) return alert("Selecciona Depto");
    if(!confirm(`¿Cargar ruta de ${dp}?`)) return;
    let cs = db.filter(c => c.depto === dp && !c.eliminado);
    if(cs.length === 0) return alert("Sin clientes");
    cs.sort((a,b) => (a.muni || "").localeCompare(b.muni || "")); // Orden por muni
    ruta = cs.map(c => c.id); save(); alert("Ruta Cargada"); mostrar('view-ruta');
}
function loadDia(d) {
    let cs = db.filter(c => c.dia === d && !c.eliminado).map(c => c.id);
    if(cs.length > 0 && confirm("¿Cargar ruta?")) { ruta = cs; save(); mostrar('view-ruta'); }
    else alert("Día vacío");
}
function renderRuta() {
    const div = document.getElementById('listaRutaContainer');
    // Safety Filter: Solo clientes que existen
    const l = db.filter(c => ruta.includes(c.id));
    document.getElementById('rutaInfo').textContent = l.length + " clientes";
    div.innerHTML = '';
    
    if(l.length === 0) { div.innerHTML = '<p class="msg-vacio">Ruta vacía</p>'; return; }

    l.forEach((c, i) => {
        // Safety Check GPS
        const hasGPS = (c.lat && !isNaN(c.lat)); 
        const btnMap = hasGPS ? `<button class="btn-sm btn-info" onclick="window.open('https://maps.google.com{c.lat},${c.lng}')">🗺️</button>` : '';
        div.innerHTML += `
        <div class="card card-ruta" style="display:flex; justify-content:space-between; align-items:center;">
            <div>
                <strong>${i+1}. ${c.negocio}</strong>
                <div style="font-size:0.8em;">${c.muni || c.depto}</div>
            </div>
            <div style="display:flex; gap:5px;">
                ${btnMap}
                <button class="btn-sm btn-success" onclick="modalVenta(${c.id})">💰</button>
                <button class="btn-sm btn-danger" onclick="toggRuta(${c.id})">X</button>
            </div>
        </div>`;
    });
}
function optimizarRutaGPS() {
    // Safety Filter
    const gps = db.filter(c => ruta.includes(c.id) && c.lat && !isNaN(c.lat));
    if(gps.length < 2) return alert("Se requieren al menos 2 clientes con GPS válido.");
    
    alert("Calculando...");
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
        const noGPS = db.filter(c => ruta.includes(c.id) && (!c.lat || isNaN(c.lat))).map(c => c.id);
        ruta = [...ord, ...noGPS]; save(); renderRuta(); alert("Optimizado");
    }, e => alert("Error GPS: " + e.message), {enableHighAccuracy:true});
}
function limpiarRuta() { if(confirm("¿Vaciar?")) { ruta = []; save(); renderRuta(); } }
function limpiarRutaFantasma() {
    // Elimina IDs de ruta que no existen en DB (Evita bugs)
    ruta = ruta.filter(id => db.some(c => c.id === id));
    save();
}

// --- FINANZAS ---
function calcFinanzas() {
    const mes = new Date().getMonth(); const hoy = new Date();
    let cob = 0, cred = 0, venc = 0;
    ventas.forEach(v => {
        let sal = v.saldo !== undefined ? v.saldo : v.monto;
        if(v.tipo === 'CONTADO' && new Date(v.fecha).getMonth() === mes) cob += v.monto;
        if(v.estado === 'PENDIENTE') {
            if(new Date(v.vence) < hoy) venc += sal; else cred += sal;
        }
    });
    abonos.forEach(a => { if(new Date(a.fecha).getMonth() === mes) cob += a.monto; });
    const com = cob * (conf.comision / 100);
    
    document.getElementById('finCobrado').textContent = `Q${cob.toFixed(2)}`;
    document.getElementById('finCredito').textContent = `Q${(cred+venc).toFixed(2)}`;
    document.getElementById('finComision').textContent = `Q${com.toFixed(2)}`;
    
    const tot = cob + cred + venc;
    const p = tot > 0 ? (cob/tot)*100 : 0;
    const p2 = tot > 0 ? (cred/tot)*100 : 0;
    document.getElementById('txtPorcentaje').textContent = Math.round(p)+'%';
    document.getElementById('graficoFinanciero').style.background = `conic-gradient(#10b981 0% ${p}%, #f59e0b ${p}% ${p+p2}%, #ef4444 ${p+p2}% 100%)`;
}
function checkAlertas() {
    const hoy = hoySQL();
    const lim = new Date(); lim.setDate(new Date().getDate() + 3);
    const limStr = lim.toISOString().split('T')[0];
    
    const v = ventas.filter(x => x.estado === 'PENDIENTE' && x.vence < hoy).length;
    const p = ventas.filter(x => x.estado === 'PENDIENTE' && x.vence >= hoy && x.vence <= limStr).length;
    
    const bR = document.getElementById('alertaRoja');
    const bY = document.getElementById('alertaAmarilla');
    
    if(v > 0) { bR.classList.remove('hidden'); document.getElementById('cantVencidos').textContent = v; } else bR.classList.add('hidden');
    if(p > 0) { bY.classList.remove('hidden'); document.getElementById('cantProximos').textContent = p; } else bY.classList.add('hidden');
}
function renderAlertas() {
    const divV = document.getElementById('listaVencidos'); divV.innerHTML = '';
    const divP = document.getElementById('listaProximos'); divP.innerHTML = '';
    const hoy = hoySQL();
    const lim = new Date(); lim.setDate(new Date().getDate() + 3); const limStr = lim.toISOString().split('T')[0];

    // Vencidos
    const dv = ventas.filter(v => v.estado === 'PENDIENTE' && v.vence < hoy);
    if(dv.length === 0) document.getElementById('msgSinVencidos').classList.remove('hidden');
    else {
        document.getElementById('msgSinVencidos').classList.add('hidden');
        dv.forEach(v => {
            const c = db.find(x => x.id === v.idCliente);
            divV.innerHTML += genCard(v, c, 'border-red', false);
        });
    }
    // Próximos
    const dp = ventas.filter(v => v.estado === 'PENDIENTE' && v.vence >= hoy && v.vence <= limStr);
    if(dp.length === 0) document.getElementById('msgSinProximos').classList.remove('hidden');
    else {
        document.getElementById('msgSinProximos').classList.add('hidden');
        dp.forEach(v => {
            const c = db.find(x => x.id === v.idCliente);
            divP.innerHTML += genCard(v, c, 'border-yellow', true);
        });
    }
}
function genCard(v, c, br, isPrevent) {
    const btnW = isPrevent ? `<button class="btn-sm btn-info" onclick="wspPrev(${c.id}, '${v.vence}')">💬</button>` : '';
    return `<div class="card ${br}" style="padding:10px; display:flex; justify-content:space-between; align-items:center;"><div><b>${c?c.negocio:'?'}</b><br><small>Vence: ${v.vence}</small></div><div>${btnW} <button class="btn-sm btn-success" onclick="modalAbono(${v.id})">Q${v.saldo}</button></div></div>`;
}

// --- SPEECHES ---
function wsp(id) {
    const c = db.find(x => x.id === id); if(!c.tel) return alert("Sin tel");
    const tit = (c.encargado.toLowerCase().match(/dr|lic/)) ? "" : "estimado/a";
    let txt = `Hola ${tit} *${c.encargado}*, le saluda *${conf.nombre}* de *Droguería Marijose*.%0A%0AConsulto existencias en *${c.negocio}* para coordinar visita.%0A%0ASaludos.`;
    window.open(`https://wa.me/502${c.tel.replace(/\D/g,'')}?text=${txt}`);
}
function wspPrev(id, f) {
    const c = db.find(x => x.id === id);
    let txt = `Hola *${c.encargado}*, le saluda *${conf.nombre}*. Recordatorio amable: su factura vence el *${f}*. ¿Paso por el cobro? Gracias.`;
    window.open(`https://wa.me/502${c.tel.replace(/\D/g,'')}?text=${txt}`);
}

// --- MODALES ---
function modalVenta(id) { document.getElementById('vId').value=id; document.getElementById('modalVenta').style.display='flex'; }
function guardarVenta() {
    const id = parseInt(document.getElementById('vId').value); const m = parseFloat(document.getElementById('vMonto').value);
    if(!m) return;
    const v = { id: Date.now(), idCliente: id, fecha: hoySQL(), concepto: document.getElementById('vConcepto').value, monto: m, saldo: m, tipo: document.getElementById('vTipo').value, estado: 'PENDIENTE', vence: document.getElementById('vFecha').value };
    if(v.tipo === 'CONTADO') { v.saldo = 0; v.estado = 'PAGADO'; }
    ventas.push(v);
    const c = db.find(x => x.id === id); if(c) c.ultimaVisita = hoySQL();
    save(); document.getElementById('modalVenta').style.display='none'; alert("OK"); renderDash();
}
function modalAbono(id) { 
    const v = ventas.find(x => x.id === id);
    document.getElementById('aId').value = id; 
    document.getElementById('lblPendiente').textContent = `Q${v.saldo}`;
    document.getElementById('aMonto').value = ''; document.getElementById('pagaCon').value = ''; document.getElementById('lblVuelto').textContent = '0.00';
    document.getElementById('modalAbono').style.display = 'flex'; 
}
function calcVuelto() {
    const ab = parseFloat(document.getElementById('aMonto').value) || 0;
    const pa = parseFloat(document.getElementById('pagaCon').value) || 0;
    document.getElementById('lblVuelto').textContent = (pa - ab).toFixed(2);
}
function guardarAbono() {
    const id = parseInt(document.getElementById('aId').value); const m = parseFloat(document.getElementById('aMonto').value);
    const v = ventas.find(x => x.id === id);
    if(m > v.saldo) return alert("Mucho");
    abonos.push({ id: Date.now(), idVenta: id, fecha: hoySQL(), monto: m });
    v.saldo -= m; if(v.saldo < 0.1) v.estado = 'PAGADO';
    save(); document.getElementById('modalAbono').style.display='none'; calcFinanzas(); renderAlertas();
}
function modalVisita(id) { document.getElementById('viId').value=id; document.getElementById('modalVisita').style.display='flex'; }
function guardarVisita() {
    const id = parseInt(document.getElementById('viId').value);
    visitas.push({ id: Date.now(), idCliente: id, fecha: hoySQL(), motivo: document.getElementById('viMotivo').value, res: document.getElementById('viRes').value, nota: document.getElementById('viNotas').value });
    const c = db.find(x => x.id === id); if(c) c.ultimaVisita = hoySQL();
    save(); document.getElementById('modalVisita').style.display='none'; alert("Registrado"); renderDash();
}

// --- UTILS ---
function hoySQL() { const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().split('T')[0]; }
function save() { 
    localStorage.setItem('db_c_v14', JSON.stringify(db)); localStorage.setItem('db_v_v14', JSON.stringify(ventas)); 
    localStorage.setItem('db_a_v14', JSON.stringify(abonos)); localStorage.setItem('db_vi_v14', JSON.stringify(visitas));
    localStorage.setItem('db_r_v14', JSON.stringify(ruta)); localStorage.setItem('conf_v14', JSON.stringify(conf));
    checkAlertas();
}
function llenarSelects() {
    const s = document.getElementById('departamento'); s.innerHTML='<option value="">-</option>';
    const p = document.getElementById('planDepto'); p.innerHTML='<option value="">Seleccione...</option>';
    DEPTOS.forEach(d => { s.innerHTML+=`<option>${d}</option>`; p.innerHTML+=`<option>${d}</option>`; });
    // Datalist
    const dl = document.getElementById('lista-productos'); dl.innerHTML='';
    (conf.misProductos || ["Amoxicilina","Vitamina","Gastrozol"]).forEach(x => dl.innerHTML+=`<option value="${x}">`);
}
function cargarMuni(d) { const s = document.getElementById('municipio'); s.innerHTML=''; if(MUNIS[d]) MUNIS[d].forEach(m=>s.innerHTML+=`<option>${m}</option>`); }
function toggRuta(id) { const i = ruta.indexOf(id); if(i<0) ruta.push(id); else ruta.splice(i,1); save(); renderDash(); }
function limpiar() { document.getElementById('negocio').value=''; }
function cerrarModal(id) { document.getElementById(id).style.display='none'; }
function toggleMedicos() { document.getElementById('camposMedicos').classList.toggle('hidden', document.getElementById('tipoNegocio').value !== 'CLINICA'); }
function toggleVenc() { document.getElementById('divVenc').classList.toggle('hidden', document.getElementById('vTipo').value !== 'CREDITO'); }
function cargarConf() { document.getElementById('confNombre').value = conf.nombre; document.getElementById('confMeta').value = conf.meta; document.getElementById('confComision').value = conf.comision; if(document.getElementById('googleScriptUrl')) document.getElementById('googleScriptUrl').value = conf.googleUrl; }
function guardarConf() { conf.nombre = document.getElementById('confNombre').value; conf.meta = document.getElementById('confMeta').value; conf.comision = document.getElementById('confComision').value; save(); alert("Guardado"); }
function backupManual() { const d={db,ventas,abonos,visitas,ruta,conf}; const a=document.createElement('a'); a.href="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(d)); a.download="backup_v14.json"; document.body.appendChild(a); a.click(); a.remove(); }
function sincronizarDrive() { const u = document.getElementById('googleScriptUrl').value; if(!u) return alert("Falta URL"); conf.googleUrl=u; save(); if(confirm("¿Subir?")) fetch(u, {method:"POST", mode:"no-cors", headers:{"Content-Type":"application/json"}, body:JSON.stringify({clientes:db, ventas:ventas})}).then(()=>alert("OK")); }
function descargarDeDrive() { const u = document.getElementById('googleScriptUrl').value; if(!u) return alert("Falta URL"); if(confirm("¿Bajar?")) fetch(u).then(r=>r.json()).then(d=>{ if(d.clientes){ db=d.clientes; save(); location.reload(); }}); }
function generarReporte() { const h = hoySQL(); const v = db.filter(c => c.ultimaVisita === h); let ht = `<h3>Reporte ${h}</h3><table border="1" style="width:100%"><tr><th>Negocio</th><th>Muni</th></tr>`; v.forEach(c => ht+=`<tr><td>${c.negocio}</td><td>${c.muni||c.depto}</td></tr>`); document.getElementById('reporteOutput').innerHTML = ht + "</table>"; window.print(); }
function exportarExcel() { let csv = "Negocio,Depto,Tel\n"; db.filter(c => !c.eliminado).forEach(c => csv += `"${c.negocio}",${c.depto},${c.tel}\n`); const a = document.createElement('a'); a.href="data:text/csv;charset=utf-8,"+encodeURI(csv); a.download="base.csv"; document.body.appendChild(a); a.click(); a.remove(); }
