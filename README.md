# Aplikacja wspomagająca naukę algebry liniowej

## 📘 Streszczenie

Celem pracy było stworzenie oraz wdrożenie aplikacji webowej, która wspomaga naukę algebry liniowej w zakresie rozwiązywania układów równań liniowych metodą eliminacji Gaussa.  

Głównym priorytetem było podejście edukacyjne — aplikacja nie tylko podaje wynik, ale również prezentuje szczegółowy proces przekształcania macierzy rozszerzonej \([A|b]\) w postaci kolejnych kroków.

Każdy etap zawiera:
- opis wykonanej operacji wierszowej,
- wizualne wyróżnienie elementu wiodącego (pivotu),
- oznaczenie modyfikowanych wierszy i kolumn.

Obliczenia realizowane są w arytmetyce wymiernej przy użyciu typu `Fraction`, co eliminuje błędy zaokrągleń i zapewnia precyzyjne wyniki.

Aplikacja została wykonana w architekturze klient–serwer:
- **Backend:** Python + Flask  
- **Frontend:** HTML, CSS, JavaScript  
- **Renderowanie notacji matematycznej:** MathJax  
- **Komunikacja:** REST API (JSON)

Projekt został zweryfikowany zestawem testów jednostkowych oraz wysokim pokryciem testami kluczowych modułów.

---

## 🎯 Cel projektu

Zapewnienie studentom narzędzia wspierającego zrozumienie metody eliminacji Gaussa poprzez wizualizację procesu obliczeniowego krok po kroku.
