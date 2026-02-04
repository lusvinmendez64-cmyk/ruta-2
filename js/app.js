/**
 * RUTA COMERCIAL GT v12 PRO - FINAL (OPTIMIZADO)
 * - Optimización de ruta lineal (Cadena lógica)
 * - Filtros de departamento aplicados a la ruta
 */

// ==========================================
// 1. CONFIGURACIÓN Y DATOS GEOGRÁFICOS
// ==========================================

const LISTA_DEPARTAMENTOS = [
    "Alta Verapaz", "Baja Verapaz", "Chimaltenango", "Chiquimula", "El Progreso", 
    "Escuintla", "Guatemala", "Huehuetenango", "Izabal", "Jalapa", "Jutiapa", 
    "Petén", "Quetzaltenango", "Quiché", "Retalhuleu", "Sacatepéquez", "San Marcos", 
    "Santa Rosa", "Sololá", "Suchitepéquez", "Totonicapán", "Zacapa"
];

const MUNICIPIOS_POR_DEPARTAMENTO = {
    "Guatemala": ["Guatemala", "Mixco", "Villa Nueva", "Santa Catarina Pinula", "San Miguel Petapa", "Amatitlán", "Chinautla"],
    "Quetzaltenango": ["Quetzaltenango", "Salcajá", "Olintepeque", "Coatepeque", "San Juan Ostuncalco", "Almolonga", "Cantel", "Zunil", "Colomba"],
    "Escuintla": ["Escuintla", "Santa Lucía Cotzumalguapa", "Palín", "Siquinalá", "Puerto San José", "La Gomera"],
    "Sacatepéquez": ["Antigua Guatemala", "San Lucas", "Jocotenango", "Ciudad Vieja", "Sumpango"],
    "Chimaltenango": ["Chimaltenango", "El Tejar", "Patzicía", "Tecpán", "Patzún"],
    "San Marcos": ["San Marcos", "San Pedro Sacatepéquez", "Malacatán", "Ayutla (Tecún Umán)"],
    "Huehuetenango": ["Huehuetenango", "Chiantla", "Malacatancito", "Cuilco"],
    "Retalhuleu": ["Retalhuleu", "San Sebastián", "Champerico"],
    "Suchitepéquez": ["Mazatenango", "Cuyotenango", "San Antonio"],
    "Totonicapán": ["Totonicapán", "San Cristóbal", "San Francisco El Alto"],
    "Sololá": ["Sololá", "Panajachel", "Nahualá"],
    "Quiché": ["Santa Cruz del Quiché", "Chichicastenango"],
    "Alta Verapaz": ["Cobán", "San Pedro Carchá", "San Juan Chamelco"],
    "Baja Verapaz": ["Salamá", "San Jerónimo"],
    "Izabal": ["Puerto Barrios", "Morales", "Livingston"],
    "Zacapa": ["Zacapa", "Estanzuela", "Río Hondo"],
    "Chiquimula": ["Chiquimula", "Esquipulas", "Jocotán"],
    "Jalapa": ["Jalapa", "San Pedro Pinula"],
    "Jutiapa": ["Jutiapa", "Asunción Mita"],
    "Santa Rosa": ["Cuilapa", "Barberena"],
    "El Progreso": ["Guastatoya", "Sanarate"],
    "Petén": ["Flores", "San Benito", "Santa Elena"]
};

// --- ESTADO GLOBAL ---
let db = JSON.parse(localStorage.getItem('db_clientes_v12')) || [];
let db_ventas = JSON.parse(localStorage.getItem('db_ventas_v12')) || [];
let db_abonos = JSON.parse(localStorage.getItem('db_abonos_v12')) || [];
let ruta = JSON.parse(localStorage.getItem('db_ruta_v12')) || [];

let userConfig = JSON.parse(localStorage.getItem('user_config_v12')) || {
    meta: 10000,
    comisionPct: 5,
    googleUrl: ""
};

let formDirty = false;
let departamentosSeleccionados = [];
let debounceTimer;

// ==========================================
// 2. HELPERS (UTILIDADES)
// ==========================================

function generarId() { return Date.now() + Math.floor(Math.random() * 10000); }

function obtenerFechaLocal() {
    const ahora = new Date();
    const offset = ahora.getTimezoneOffset() * 60000;
    const local = new Date(ahora.getTime() - offset);
    return local.toISOString().split('T')[0];
}

function guardarDB() {
    try {
        localStorage.setItem('db_clientes_v12', JSON.stringify(db));
        localStorage.setItem('db_ventas_v12', JSON.stringify(db_ventas));
        localStorage.setItem('db_abonos_v12', JSON.stringify(db_abonos));
        localStorage.setItem('db_ruta_v12', JSON.stringify(ruta));
        localStorage.setItem('user_config_v12', JSON.stringify(userConfig));
    } catch(e) { 
        alert("⚠️ Memoria llena. Borra datos del navegador."); 
    }
}

// ==========================================
// 3. INICIALIZACIÓN Y NAVEGACIÓN
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    cargarDepartamentosEnSelects();
    
    // Cargar Config
    if(document.getElementById('configMeta')) document.getElementById('configMeta').value = userConfig.meta;
    if(document.getElementById('configComision')) document.getElementById('configComision').value = userConfig.comisionPct;
    if(document.getElementById('googleScriptUrl')) document.getElementById('googleScriptUrl').value = userConfig.googleUrl;

    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('fecha-header').textContent = new Date().toLocaleDateString('es-GT', opciones);

    mostrar('view-dashboard');
});

function mostrar(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    if(viewId === 'view-dashboard') {
        document.getElementById('nav-home').classList.add('active');
        renderDashboard();
    } else if (viewId === 'view-finanzas') {
        document.getElementById('nav-finanzas').classList.add('active');
        recalcularFinanzas();
        renderListaMorosos();
    } else if (viewId === 'view-ruta') {
        document.getElementById('nav-ruta').classList.add('active');
        renderRuta(); // Ahora aplica filtros también
    } else if (viewId === 'view-reportes') {
        document.getElementById('nav-rep').classList.add('active');
    } else if (viewId === 'view-papelera') {
        document.getElementById('nav-trash').classList.add('active');
        renderPapelera();
    }
}

// ==========================================
// 4. DASHBOARD Y CLIENTES
// ==========================================

function renderDashboard() {
    const contenedor = document.getElementById('listaClientes');
    const busqueda = document.getElementById('buscadorDashboard').value.toLowerCase();
    
    let datos = db.filter(c => !c.eliminado);
    
    // Filtro Deptos
    if(departamentosSeleccionados.length > 0) {
        datos = datos.filter(c => departamentosSeleccionados.includes(c.departamento));
    }
    
    // Filtro Texto
    if(busqueda) {
        datos = datos.filter(c => 
            (c.negocio && c.negocio.toLowerCase().includes(busqueda)) ||
            (c.telefono && c.telefono.includes(busqueda))
        );
    }

    datos.sort((a,b) => (a.departamento + a.negocio).localeCompare(b.departamento + b.negocio));

    document.getElementById('statTotal').textContent = datos.length;
    document.getElementById('statHoy').textContent = datos.filter(c => c.ultimaVisita === obtenerFechaLocal()).length;

    if(datos.length === 0) {
        contenedor.innerHTML = '';
        document.getElementById('msgVacio').classList.remove('hidden');
        return;
    }
    document.getElementById('msgVacio').classList.add('hidden');

    let html = '';
    const hoy = new Date();

    datos.forEach(c => {
        const ultima = new Date(c.ultimaVisita || '2000-01-01');
        const diffDias = Math.floor((hoy - ultima) / (1000 * 60 * 60 * 24));
        let bordeClase = diffDias > 30 ? 'border-red' : (diffDias > 15 ? 'border-yellow' : 'border-green');
        const enRuta = ruta.includes(c.id);

        html += `
        <div class="card ${bordeClase}">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="flex:1;">
                    <span style="font-size:0.7em; background:#e3f2fd; color:#1565c0; padding:2px 8px; border-radius:10px;">${c.departamento}</span>
                    <h3 style="margin:5px 0; border:none; padding:0;">${c.negocio}</h3>
                    <div style="font-size:0.8em; color:#666;">📞 ${c.telefono}</div>
                    <div style="font-size:0.75em; color:#888;">Hace ${diffDias} días</div>
                </div>
                <div style="display:flex; flex-direction:column; gap:8px; margin-left:10px;">
                    <button class="btn-icon" style="background:${enRuta?'#ef4444':'#b0bec5'}" onclick="toggleRuta(${c.id})">
                        ${enRuta ? '🚫' : '🚚'}
                    </button>
                    <button class="btn-icon btn-info" onclick="editarCliente(${c.id})">✏️</button>
                    <button class="btn-icon btn-success" onclick="abrirModalVenta(${c.id}, '${c.negocio}')">💰</button>
                    <button class="btn-icon btn-danger" onclick="papeleraCliente(${c.id})">🗑️</button>
                </div>
            </div>
        </div>`;
    });
    contenedor.innerHTML = html;
}

function debounceBuscar() { clearTimeout(debounceTimer); debounceTimer = setTimeout(renderDashboard, 300); }

// ==========================================
// 5. FINANZAS, ABONOS Y COMISIONES
// ==========================================

function abrirModalVenta(idCliente, nombre) {
    document.getElementById('ventaIdCliente').value = idCliente;
    document.getElementById('ventaClienteNombre').textContent = nombre;
    document.getElementById('ventaMonto').value = '';
    document.getElementById('ventaConcepto').value = '';
    document.getElementById('ventaTipo').value = 'CONTADO';
    toggleVencimiento();
    document.getElementById('btnGuardarVenta').disabled = false;
    document.getElementById('btnGuardarVenta').textContent = "Registrar";
    document.getElementById('modalVenta').style.display = 'flex';
}

function guardarVenta() {
    const btn = document.getElementById('btnGuardarVenta');
    btn.disabled = true; btn.textContent = "Guardando...";

    const idCliente = parseInt(document.getElementById('ventaIdCliente').value);
    const monto = parseFloat(document.getElementById('ventaMonto').value);
    const tipo = document.getElementById('ventaTipo').value;
    const concepto = document.getElementById('ventaConcepto').value;
    const fechaVenc = document.getElementById('ventaVencimiento').value;

    if(!monto || monto <= 0) {
        alert("Monto inválido");
        btn.disabled = false; btn.textContent = "Registrar";
        return;
    }

    const nuevaVenta = {
        id: generarId(),
        idCliente: idCliente,
        fechaVenta: obtenerFechaLocal(),
        concepto: concepto || "Venta General",
        monto: monto,
        saldoPendiente: (tipo === 'CONTADO') ? 0 : monto,
        tipo: tipo,
        estado: (tipo === 'CONTADO') ? 'PAGADO' : 'PENDIENTE',
        fechaVencimiento: (tipo === 'CREDITO') ? fechaVenc : null
    };

    db_ventas.push(nuevaVenta);
    const idx = db.findIndex(c => c.id === idCliente);
    if(idx >= 0) db[idx].ultimaVisita = obtenerFechaLocal();

    guardarDB();
    alert("✅ Venta registrada");
    document.getElementById('modalVenta').style.display = 'none';
    renderDashboard();
}

function toggleVencimiento() {
    const tipo = document.getElementById('ventaTipo').value;
    const div = document.getElementById('divVencimiento');
    if(tipo === 'CREDITO') {
        div.classList.remove('hidden');
        const hoy = new Date(); hoy.setDate(hoy.getDate() + 30);
        document.getElementById('ventaVencimiento').value = hoy.toISOString().split('T')[0];
    } else {
        div.classList.add('hidden');
    }
}

function abrirModalAbono(idVenta) {
    const venta = db_ventas.find(v => v.id === idVenta);
    if(!venta) return;
    document.getElementById('abonoIdVenta').value = idVenta;
    document.getElementById('lblSaldoPendiente').textContent = `Q${venta.saldoPendiente.toFixed(2)}`;
    document.getElementById('montoAbono').value = '';
    document.getElementById('modalAbono').style.display = 'flex';
}

function guardarAbono() {
    const idVenta = parseInt(document.getElementById('abonoIdVenta').value);
    const montoAbono = parseFloat(document.getElementById('montoAbono').value);
    const idx = db_ventas.findIndex(v => v.id === idVenta);
    
    if(idx === -1 || !montoAbono || montoAbono <= 0) return;
    const venta = db_ventas[idx];
    
    if(montoAbono > venta.saldoPendiente) {
        alert("⚠️ Abono mayor a la deuda."); return;
    }

    db_abonos.push({ id: generarId(), idVenta: idVenta, fecha: obtenerFechaLocal(), monto: montoAbono });
    venta.saldoPendiente -= montoAbono;
    
    if(venta.saldoPendiente < 0.01) {
        venta.saldoPendiente = 0;
        venta.estado = 'PAGADO';
        alert("🎉 ¡Deuda Cancelada!");
    } else {
        alert("✅ Abono registrado");
    }

    db_ventas[idx] = venta;
    guardarDB();
    document.getElementById('modalAbono').style.display = 'none';
    recalcularFinanzas();
    renderListaMorosos();
}

function recalcularFinanzas() {
    const inputMeta = parseFloat(document.getElementById('configMeta').value) || 10000;
    const inputComision = parseFloat(document.getElementById('configComision').value) || 5;
    userConfig.meta = inputMeta;
    userConfig.comisionPct = inputComision;
    guardarDB();

    const mesActual = new Date().getMonth();
    const anioActual = new Date().getFullYear();
    let totalCobradoMes = 0;
    let creditoEnCalle = 0;

    db_ventas.forEach(v => {
        const fecha = new Date(v.fechaVenta);
        if(v.tipo === 'CONTADO' && fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual) {
            totalCobradoMes += v.monto;
        }
        if(v.estado === 'PENDIENTE') {
            creditoEnCalle += (v.saldoPendiente !== undefined ? v.saldoPendiente : v.monto);
        }
    });

    db_abonos.forEach(a => {
        const fecha = new Date(a.fecha);
        if(fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual) {
            totalCobradoMes += a.monto;
        }
    });

    const comisionGanada = totalCobradoMes * (userConfig.comisionPct / 100);

    document.getElementById('finCobradoMes').textContent = `Q${totalCobradoMes.toFixed(2)}`;
    document.getElementById('finCreditoCalle').textContent = `Q${creditoEnCalle.toFixed(2)}`;
    document.getElementById('finComision').textContent = `Q${comisionGanada.toFixed(2)}`;

    let porcentaje = (totalCobradoMes / userConfig.meta) * 100;
    if(porcentaje > 100) porcentaje = 100;
    document.getElementById('progressBar').style.width = porcentaje + '%';
    document.getElementById('lblMetaPorcentaje').textContent = Math.round(porcentaje) + '%';
}

function renderListaMorosos() {
    const div = document.getElementById('listaMorosos');
    const msg = document.getElementById('msgSinDeuda');
    div.innerHTML = '';
    const pendientes = db_ventas.filter(v => v.estado === 'PENDIENTE');
    
    if(pendientes.length === 0) {
        msg.classList.remove('hidden'); return;
    }
    msg.classList.add('hidden');
    pendientes.sort((a,b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));

    let html = '';
    pendientes.forEach(v => {
        const cliente = db.find(c => c.id === v.idCliente);
        const nombre = cliente ? cliente.negocio : 'Borrado';
        const saldo = v.saldoPendiente !== undefined ? v.saldoPendiente : v.monto;
        html += `
        <div class="card" style="border-left: 5px solid #ef4444; padding: 15px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div><strong>${nombre}</strong><div style="font-size:0.8em; color:#555;">${v.concepto}</div></div>
                <div style="text-align:right;"><div style="font-size:1.1em; font-weight:bold; color:#ef4444;">Q${saldo.toFixed(2)}</div><button class="btn btn-sm btn-success" style="margin-top:5px;" onclick="abrirModalAbono(${v.id})">Abonar</button></div>
            </div>
        </div>`;
    });
    div.innerHTML = html;
}

// ==========================================
// 6. RUTA Y OPTIMIZACIÓN LÓGICA (CADENA)
// ==========================================

function toggleRuta(id) {
    const index = ruta.indexOf(id);
    if(index === -1) ruta.push(id);
    else ruta.splice(index, 1);
    guardarDB();
    renderDashboard();
    renderRuta();
}

function renderRuta() {
    const container = document.getElementById('listaRutaContainer');
    const info = document.getElementById('rutaInfo');
    
    // 1. Obtener clientes
    let clientesRuta = db.filter(c => ruta.includes(c.id));
    
    // 2. APLICAR FILTRO DE DEPARTAMENTOS (Corrección Solicitada)
    if(departamentosSeleccionados.length > 0) {
        clientesRuta = clientesRuta.filter(c => departamentosSeleccionados.includes(c.departamento));
    }
    
    if(info) info.textContent = `${clientesRuta.length} clientes en ruta`;
    
    if(clientesRuta.length === 0) {
        container.innerHTML = '<p class="msg-vacio">Ruta vacía o filtrada.</p>';
        return;
    }

    let html = '';
    clientesRuta.forEach((c, idx) => {
        const mapaUrl = (c.lat && c.lat !== 'MANUAL') ? `http://googleusercontent.com/maps.google.com/6{c.lat},${c.lng}` : c.lng;
        html += `
        <div class="card card-ruta">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div><strong style="font-size:1.1em;">${idx+1}. ${c.negocio}</strong><div style="font-size:0.9em; margin-top:3px;">${c.direccion || 'Sin dirección'}</div></div>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-sm btn-info" onclick="window.open('${mapaUrl}', '_blank')">🗺️</button>
                    <button class="btn btn-sm btn-success" onclick="abrirModalVenta(${c.id}, '${c.negocio}')">💰</button>
                    <button class="btn btn-sm btn-danger" onclick="toggleRuta(${c.id})">✕</button>
                </div>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

function abrirMapaRuta() {
    if(ruta.length === 0) { alert("Ruta vacía."); return; }
    // Crear URL de Google Maps con waypoints (Limitado a 9 puntos por URL en versión gratis, abrimos el primero)
    const primerCliente = db.find(c => c.id === ruta[0]);
    if(primerCliente && primerCliente.lat && primerCliente.lat !== 'MANUAL') {
        window.open(`http://googleusercontent.com/maps.google.com/7{primerCliente.lat},${primerCliente.lng}`, '_blank');
    } else {
        alert("El primer cliente no tiene GPS válido.");
    }
}

function getDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// OPTIMIZACIÓN LÓGICA EN CADENA (A -> B -> C)
function optimizarRuta() {
    const clientesConGPS = db.filter(c => ruta.includes(c.id) && c.lat && c.lat !== 'MANUAL');
    const clientesSinGPSIds = db.filter(c => ruta.includes(c.id) && (!c.lat || c.lat === 'MANUAL')).map(c => c.id);

    if(clientesConGPS.length < 2) { alert("Se requieren al menos 2 clientes con GPS."); return; }
    if(!navigator.geolocation) { alert("GPS no disponible."); return; }

    const btn = event.target; 
    const textoOriginal = btn.textContent;
    btn.textContent = "📡 Organizando...";
    btn.disabled = true;

    navigator.geolocation.getCurrentPosition(pos => {
        let currentLat = pos.coords.latitude;
        let currentLng = pos.coords.longitude;
        
        let rutaOrdenadaIds = [];
        let pendientes = [...clientesConGPS]; // Copia del array

        // Algoritmo del Vecino Más Cercano (Nearest Neighbor Chain)
        while(pendientes.length > 0) {
            let masCercano = null;
            let distMinima = Infinity;
            let indexMasCercano = -1;

            // Buscar cual de los pendientes está más cerca de mi "posición actual"
            for(let i = 0; i < pendientes.length; i++) {
                const c = pendientes[i];
                const d = getDistancia(currentLat, currentLng, parseFloat(c.lat), parseFloat(c.lng));
                if(d < distMinima) {
                    distMinima = d;
                    masCercano = c;
                    indexMasCercano = i;
                }
            }

            if(masCercano) {
                rutaOrdenadaIds.push(masCercano.id);
                // Ahora mi posición actual es este cliente (para buscar el siguiente desde aquí)
                currentLat = parseFloat(masCercano.lat);
                currentLng = parseFloat(masCercano.lng);
                // Lo quitamos de pendientes
                pendientes.splice(indexMasCercano, 1);
            }
        }

        // Guardamos la nueva ruta: Ordenados por GPS + Los que no tienen GPS al final
        ruta = [...rutaOrdenadaIds, ...clientesSinGPSIds];
        guardarDB();
        renderRuta();
        
        alert("✅ Ruta organizada lógicamente (Inicio -> Más cercano -> Siguiente).");
        btn.textContent = textoOriginal;
        btn.disabled = false;

    }, err => {
        alert("Error GPS: " + err.message);
        btn.textContent = textoOriginal;
        btn.disabled = false;
    });
}

// ==========================================
// 7. GOOGLE SHEETS, BACKUP Y REPORTES
// ==========================================

function realizarBackupManual() {
    const backupData = {
        clientes: db,
        ventas: db_ventas,
        abonos: db_abonos,
        ruta: ruta,
        config: userConfig,
        fecha: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = "backup_ruta_" + obtenerFechaLocal() + ".json";
    document.body.appendChild(a); a.click(); a.remove();
}

function generarReporteDiario() {
    const hoy = obtenerFechaLocal();
    const visitados = db.filter(c => c.ultimaVisita === hoy && !c.eliminado);
    
    let html = `<h2 style="text-align:center">Reporte ${hoy}</h2>
    <table border="1" style="width:100%; border-collapse:collapse; font-size:12px;">
        <tr style="background:#eee;"><th>Cliente</th><th>Depto</th><th>Tel</th></tr>`;
    visitados.forEach(c => html += `<tr><td>${c.negocio}</td><td>${c.departamento}</td><td>${c.telefono}</td></tr>`);
    html += `</table>`;
    
    const div = document.getElementById('reporteOutput');
    div.innerHTML = html; div.classList.remove('hidden');
    window.print();
    setTimeout(() => div.classList.add('hidden'), 1000);
}

function exportarExcel() {
    let csv = "ID,Negocio,Departamento,Municipio,Telefono,Encargado\n";
    db.filter(c => !c.eliminado).forEach(c => {
        csv += `${c.id},"${c.negocio}",${c.departamento},${c.municipio},${c.telefono},"${c.encargado}"\n`;
    });
    const a = document.createElement('a');
    a.href = "data:text/csv;charset=utf-8," + encodeURI(csv);
    a.download = "base_clientes.csv";
    document.body.appendChild(a); a.click(); a.remove();
}

function sincronizarDrive() {
    const url = document.getElementById('googleScriptUrl').value;
    if(!url) { alert("Pega la URL del Google Script"); return; }
    userConfig.googleUrl = url; guardarDB();
    if(!confirm("¿Subir datos a la nube?")) return;

    fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientes: db, ventas: db_ventas })
    }).then(() => alert("✅ Enviado a segundo plano.")).catch(e => alert("Error: " + e));
}

function descargarDeDrive() {
    const url = document.getElementById('googleScriptUrl').value;
    if(!url) { alert("Falta URL"); return; }
    if(!confirm("⚠️ ¿Reemplazar datos locales con la nube?")) return;

    fetch(url).then(r => r.json()).then(data => {
        if(data.clientes) {
            db = data.clientes;
            guardarDB();
            alert("✅ Datos restaurados.");
            location.reload();
        }
    }).catch(e => alert("Error descarga: " + e));
}

// ==========================================
// 8. CRUD CLIENTES Y GPS MANUAL
// ==========================================

function nuevoCliente() { limpiarForm(); document.getElementById('tituloForm').textContent="Nuevo"; mostrar('view-form'); }

function editarCliente(id) {
    const c = db.find(x => x.id === id);
    if(!c) return;
    document.getElementById('idCliente').value = c.id;
    document.getElementById('negocio').value = c.negocio;
    document.getElementById('departamento').value = c.departamento;
    cargarMunicipiosPorDepartamento(c.departamento);
    document.getElementById('municipio').value = c.municipio;
    document.getElementById('direccion').value = c.direccion;
    document.getElementById('telefono').value = c.telefono;
    document.getElementById('encargado').value = c.encargado;
    document.getElementById('lat').value = c.lat || '';
    document.getElementById('lng').value = c.lng || '';
    document.getElementById('gpsStatus').textContent = c.lat ? "✅ GPS OK" : "Sin GPS";
    document.getElementById('tituloForm').textContent="Editar"; 
    mostrar('view-form');
}

function guardarCliente() {
    const id = document.getElementById('idCliente').value;
    const n = document.getElementById('negocio').value;
    if(!n) return;
    
    const d = { 
        id: id?parseInt(id):generarId(), 
        negocio: n, 
        departamento: document.getElementById('departamento').value, 
        municipio: document.getElementById('municipio').value, 
        direccion: document.getElementById('direccion').value, 
        telefono: document.getElementById('telefono').value, 
        encargado: document.getElementById('encargado').value, 
        lat: document.getElementById('lat').value, 
        lng: document.getElementById('lng').value, 
        eliminado: false, 
        ultimaVisita: obtenerFechaLocal() 
    };
    
    if(id) { const i = db.findIndex(x=>x.id==id); db[i] = {...db[i], ...d}; } else { db.push(d); }
    guardarDB(); mostrar('view-dashboard');
}

function papeleraCliente(id) { if(confirm("¿Papelera?")) { const i = db.findIndex(x=>x.id==id); db[i].eliminado=true; guardarDB(); renderDashboard(); } }
function renderPapelera() {
    const l = document.getElementById('listaPapelera'); l.innerHTML='';
    db.filter(c=>c.eliminado).forEach(c => l.innerHTML+=`<div class="card"><strong>${c.negocio}</strong><button class="btn btn-info btn-sm" onclick="restaurar(${c.id})">Restaurar</button></div>`);
}
function restaurar(id) { const i = db.findIndex(x=>x.id==id); db[i].eliminado=false; guardarDB(); renderPapelera(); }
function vaciarPapelera() { if(confirm("¿Borrar Definitivamente?")) { db = db.filter(c=>!c.eliminado); guardarDB(); renderPapelera(); } }

function limpiarForm() { document.getElementById('idCliente').value=''; document.getElementById('negocio').value=''; document.getElementById('telefono').value=''; }
function cerrarModal(id) { document.getElementById(id).style.display='none'; }
function cerrarDiaBackup() { realizarBackupManual(); }

function irGPS() { if(!document.getElementById('negocio').value) { alert("Pon nombre"); return; } mostrar('view-gps'); }
function obtenerGPS() { navigator.geolocation.getCurrentPosition(p=>{ document.getElementById('lat').value=p.coords.latitude; document.getElementById('lng').value=p.coords.longitude; document.getElementById('gpsTxt').textContent="GPS OK"; }, e=>alert("Error GPS")); }
function usarManual() { const l=document.getElementById('linkMan').value; if(l){ document.getElementById('lat').value='MANUAL'; document.getElementById('lng').value=l; alert("OK"); }}

function cargarDepartamentosEnSelects() {
    const s = document.getElementById('departamento'); s.innerHTML='<option value="">Seleccione...</option>';
    LISTA_DEPARTAMENTOS.forEach(d=>s.innerHTML+=`<option value="${d}">${d}</option>`);
    const c = document.querySelector('.dept-checkboxes-container');
    let h=''; LISTA_DEPARTAMENTOS.forEach(d=>h+=`<div style="padding:5px;"><label><input type="checkbox" value="${d}"> ${d}</label></div>`);
    c.innerHTML=h;
}
function cargarMunicipiosPorDepartamento(d) {
    const s = document.getElementById('municipio'); s.innerHTML='';
    if(MUNICIPIOS_POR_DEPARTAMENTO[d]) MUNICIPIOS_POR_DEPARTAMENTO[d].forEach(m=>s.innerHTML+=`<option value="${m}">${m}</option>`);
}
function toggleDeptDropdown() { document.getElementById('deptDropdown').classList.toggle('hidden'); }
function aplicarFiltroDepartamentos() { departamentosSeleccionados = Array.from(document.querySelectorAll('.dept-checkboxes-container input:checked')).map(x=>x.value); toggleDeptDropdown(); renderDashboard(); }
function limpiarFiltroDepartamentos() { document.querySelectorAll('.dept-checkboxes-container input').forEach(x=>x.checked=false); aplicarFiltroDepartamentos(); }

function activarDictado(id) { 
    if(!('webkitSpeechRecognition' in window)) { alert("No soportado"); return; }
    const r = new webkitSpeechRecognition(); r.lang="es-GT"; r.start();
    r.onresult = e => document.getElementById(id).value = e.results[0][0].transcript;
}