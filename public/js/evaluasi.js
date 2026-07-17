// File: public/js/evaluasi.js
// Logika frontend formulir evaluasi kegiatan — dipindahkan dari inline script evaluasi.html

var instrumenConfig = {};
var narasumberList = [];

function getQueryParam(name) {
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(window.location.href);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

var kegiatanId = getQueryParam('kegiatan') || getQueryParam('id');
var shortCode = getQueryParam('c');

// Flow: Keterlaksanaan (K) -> Sarana Prasarana (S) -> Narasumber (N)
var steps = ['K', 'S'];
var currentStepIndex = 0;

// Store responses for each step
var allPayloads = [];

function loadData() {
    if (shortCode) {
        // polyfill fetch if missing?
        if (typeof fetch === 'undefined') {
            document.getElementById('namaKegiatanTitle').textContent = "Browser tidak mendukung. Silakan gunakan Chrome/Safari terbaru.";
            return;
        }
        fetch('/evaluasi/api/kegiatan/code/' + shortCode)
            .then(function(resCode) {
                return resCode.json();
            })
            .then(function(dataCode) {
                if (dataCode.success) {
                    kegiatanId = dataCode.nama_kegiatan;
                    fetchKegiatan();
                } else {
                    document.getElementById('namaKegiatanTitle').textContent = "Kode Kegiatan Tidak Valid";
                }
            })
            .catch(function(e) {
                document.getElementById('namaKegiatanTitle').textContent = "Gagal memverifikasi kode kegiatan";
            });
    } else {
        fetchKegiatan();
    }
}

function fetchKegiatan() {
    if (!kegiatanId) {
        document.getElementById('namaKegiatanTitle').textContent = "Parameter ID atau Kode tidak valid";
        return;
    }

    document.getElementById('kegiatan_id').value = kegiatanId;

    if (typeof fetch === 'undefined') {
        document.getElementById('namaKegiatanTitle').textContent = "Browser tidak mendukung. Silakan gunakan Chrome/Safari terbaru.";
        return;
    }

    fetch('/evaluasi/api/kegiatan/' + encodeURIComponent(kegiatanId))
        .then(function(res) {
            return res.json();
        })
        .then(function(data) {
            if (data.success) {
                document.getElementById('namaKegiatanTitle').textContent = data.data.nama_kegiatan;
                instrumenConfig = data.data.instrumen;
                narasumberList = data.data.narasumber_list || [];
                
                // Jika ada narasumber, pisahkan masing-masing ke step tersendiri
                if (narasumberList.length > 0) {
                    narasumberList.forEach(function(ns, index) {
                        steps.push({ tipe: 'N', index: index, name: ns });
                    });
                }
                
                if (data.data.tgl_mulai) {
                    var dateStr = formatTanggalRange(data.data.tgl_mulai, data.data.tgl_akhir);
                    document.getElementById('tanggalKegiatan').textContent = "Tanggal Pelaksanaan: " + dateStr;
                }
                
                renderStep();
            } else {
                document.getElementById('namaKegiatanTitle').textContent = "Kegiatan tidak ditemukan";
            }
        })
        .catch(function(e) {
            document.getElementById('namaKegiatanTitle').textContent = "Gagal memuat data";
        });
}

function getStepInfo(step) {
    if (typeof step === 'string') {
        return {
            tipe: step,
            judul: step === 'K' ? 'Keterlaksanaan' : 'Sarana & Prasarana'
        };
    } else {
        return {
            tipe: 'N',
            judul: 'Narasumber: ' + step.name
        };
    }
}

function renderStep() {
    var stepInfo = getStepInfo(steps[currentStepIndex]);
    var isLastStep = currentStepIndex === steps.length - 1;
    
    var progressPercent = Math.round(((currentStepIndex) / steps.length) * 100);
    document.getElementById('progressBar').style.width = progressPercent + '%';
    document.getElementById('progressText').textContent = progressPercent + '%';
    document.getElementById('tipeEvalTitle').textContent = 'Evaluasi ' + stepInfo.judul;
    
    // Hide global fields (Nama) if not on first step
    var globalFields = document.getElementById('globalFields');
    if (currentStepIndex === 0) {
        globalFields.style.display = 'block';
    } else {
        globalFields.style.display = 'none';
    }
    
    buildQuestions(stepInfo);
    
    if (isLastStep) {
        document.getElementById('btnSubmit').textContent = "Kirim Semua Evaluasi";
    } else {
        document.getElementById('btnSubmit').textContent = "Selanjutnya";
    }
    
    // Clear previous saran
    document.getElementById('saran').value = '';
    
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function formatTanggalRange(str1, str2) {
    var months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    try {
        var d1 = new Date(str1);
        if (isNaN(d1.getTime())) return str1;
        var dd1 = d1.getDate();
        var mm1 = d1.getMonth();
        var yy1 = d1.getFullYear();

        if (!str2 || str1 === str2) {
            return dd1 + ' ' + months[mm1] + ' ' + yy1;
        }

        var d2 = new Date(str2);
        if (isNaN(d2.getTime())) return dd1 + ' ' + months[mm1] + ' ' + yy1 + ' s.d. ' + str2;
        
        var dd2 = d2.getDate();
        var mm2 = d2.getMonth();
        var yy2 = d2.getFullYear();

        if (yy1 === yy2 && mm1 === mm2) {
            return dd1 + ' s.d. ' + dd2 + ' ' + months[mm1] + ' ' + yy1;
        } else if (yy1 === yy2) {
            return dd1 + ' ' + months[mm1] + ' s.d. ' + dd2 + ' ' + months[mm2] + ' ' + yy1;
        } else {
            return dd1 + ' ' + months[mm1] + ' ' + yy1 + ' s.d. ' + dd2 + ' ' + months[mm2] + ' ' + yy2;
        }
    } catch(e) {
        return str1;
    }
}

function buildQuestions(stepInfo) {
    var container = document.getElementById('questionsContainer');
    var labels = instrumenConfig[stepInfo.tipe] || [];
    
    var html = '<div style="overflow-x: auto;">' +
        '<table class="likert-table">' +
            '<thead>' +
                '<tr>' +
                    '<th style="text-align: left; width: 45%;">Aspek Penilaian</th>' +
                    '<th style="width: 11%;">Sangat Baik<br>(5)</th>' +
                    '<th style="width: 11%;">Baik<br>(4)</th>' +
                    '<th style="width: 11%;">Cukup Baik<br>(3)</th>' +
                    '<th style="width: 11%;">Kurang Baik<br>(2)</th>' +
                    '<th style="width: 11%;">Sangat Kurang<br>(1)</th>' +
                '</tr>' +
            '</thead>' +
            '<tbody>';
    
    labels.forEach(function(label, idx) {
        var qNum = idx + 1;
        html += '<tr>' +
            '<td>' +
                '<div style="display: flex; gap: 6px;">' +
                    '<span style="flex-shrink: 0;">' + qNum + '.</span>' +
                    '<span>' + label + ' <span style="color:red">*</span></span>' +
                '</div>' +
            '</td>' +
            '<td><input type="radio" name="a' + qNum + '" value="5" required></td>' +
            '<td><input type="radio" name="a' + qNum + '" value="4"></td>' +
            '<td><input type="radio" name="a' + qNum + '" value="3"></td>' +
            '<td><input type="radio" name="a' + qNum + '" value="2"></td>' +
            '<td><input type="radio" name="a' + qNum + '" value="1"></td>' +
        '</tr>';
    });
    
    html += '</tbody></table></div>';
    
    container.innerHTML = html;
}

document.getElementById('evalForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    var stepObj = steps[currentStepIndex];
    var stepInfo = getStepInfo(stepObj);
    
    // Ambil nama dari input form jika masih di halaman 1, jika tidak gunakan nama dari payload sebelumnya
    var globalNamaPeserta = document.getElementById('nama_peserta').value;
    if (currentStepIndex > 0 && allPayloads.length > 0) {
        globalNamaPeserta = allPayloads[0].nama_peserta;
    }

    var stepPayload = {
        kegiatan_id: document.getElementById('kegiatan_id').value,
        tipe_evaluasi: stepInfo.tipe,
        nama_peserta: globalNamaPeserta,
        saran: document.getElementById('saran').value
    };

    if (stepInfo.tipe === 'N') {
        stepPayload.nama_narasumber = stepObj.name;
    }

    var maxQ = instrumenConfig[stepInfo.tipe] ? instrumenConfig[stepInfo.tipe].length : 13;
    for (var q = 1; q <= maxQ; q++) {
        var val = '';
        var radios = document.getElementsByName('a' + q);
        for (var i = 0; i < radios.length; i++) {
            if (radios[i].checked) {
                val = radios[i].value;
                break;
            }
        }
        if (val) {
            stepPayload['a' + q] = parseInt(val);
        }
    }
    
    allPayloads.push(stepPayload);
    
    var isLastStep = currentStepIndex === steps.length - 1;
    
    if (!isLastStep) {
        currentStepIndex++;
        renderStep();
    } else {
        var btn = document.getElementById('btnSubmit');
        btn.textContent = "Mengirim...";
        btn.disabled = true;

        // Simple recursive function to send payloads sequentially without async/await
        function sendPayload(index) {
            if (index >= allPayloads.length) {
                document.getElementById('formContainer').classList.add('hidden');
                document.getElementById('successContainer').classList.remove('hidden');
                return;
            }

            fetch('/evaluasi/api/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(allPayloads[index])
            })
            .then(function(res) {
                if (!res.ok) throw new Error('Gagal mengirim data');
                sendPayload(index + 1);
            })
            .catch(function(err) {
                alert("Kesalahan jaringan saat mengirim data. Silakan coba lagi.");
                btn.textContent = "Kirim Semua Evaluasi";
                btn.disabled = false;
                allPayloads.pop();
            });
        }
        
        sendPayload(0);
    }
});

loadData();
