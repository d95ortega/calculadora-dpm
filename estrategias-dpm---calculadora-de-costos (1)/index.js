function calcular() {
  const costo = document.getElementById("costo").value;
  const resultado = document.getElementById("resultado");

  if (!costo) {
    resultado.textContent = "Ingresa un valor válido";
    resultado.className = "text-red-600 mt-4 text-center";
    return;
  }

  const total = Number(costo) * 1.3;

  resultado.textContent = `Precio sugerido: $ ${total.toLocaleString()}`;
  resultado.className = "text-green-600 mt-4 text-center";
}
