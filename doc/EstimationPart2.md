# Project Estimation part 2

L’obiettivo di questo documento è confrontare l’effort e la dimensione effettiva del progetto con le stime fatte nel task 1.

## Stima per dimensione

Per calcolare le linee di codice (LOC) è stato utilizzato lo strumento `cloc`.  
Sono stati calcolati separatamente:
- **LOC del codice di produzione:** 2.404 LOC 
```bash
      51 text files.
      51 unique files.                              
       2 files ignored.

github.com/AlDanial/cloc v 2.04  T=0.03 s (1496.4 files/s, 98794.1 lines/s)
-------------------------------------------------------------------------------
Language                     files          blank        comment           code
-------------------------------------------------------------------------------
TypeScript                      51            359            604           2404
-------------------------------------------------------------------------------
SUM:                            51            359            604           2404
-------------------------------------------------------------------------------
```

- **LOC del codice di test:** 7.134 LOC 
```bash
      38 text files.
      38 unique files.
       2 files ignored.

github.com/AlDanial/cloc v 2.04  T=1.11 s (33.3 files/s, 7899.2 lines/s)
-------------------------------------------------------------------------------
Language                     files          blank        comment           code
-------------------------------------------------------------------------------
TypeScript                      37           1449            184           7134
-------------------------------------------------------------------------------
SUM:                            37           1449            184           7134
-------------------------------------------------------------------------------
```


## Calcolo dell’effort

L’effort totale è stato calcolato sommando tutte le ore di lavoro riportate nel file `Timesheet.md`, considerando **tutte le attività** (Task 1, Task 2, Task 3) fino al 7 giugno.  
Task 4 (Containerization) è stato escluso.

Risultato:
- **Effort totale:** 377 ore/uomo

## Calcolo della produttività

La produttività è stata calcolata come:

$$\text{produttività} = \frac{\text{LOC produzione} + \text{LOC test}}{\text{effort}} = \frac{2.404 + 7.134}{377} \approx 25,2 \text{ LOC/h}$$


## Confronto tra stima e valori effettivi

|                              | **Stima (fine Task 1)** | **Valore reale (7 giugno, fine Task 3)** |
| ---------------------------- | ----------------------- | ---------------------------------------- |
| Dimensione codice produzione | 1.870 LOC               | 2.404 LOC                                |
| Dimensione codice test       | non stimato             | 7.134 LOC                                |
| Dimensione totale            | 1.870 LOC (solo prod.)  | 9.538 LOC                                |
| Effort                       | 130–187 PH              | 377 PH                                   |
| Produttività                 | 10 LOC/PH               | 25,2 LOC/PH                              |


## Nota sulla stima dell’effort

Come stima dell’effort, è stato utilizzato il valore ottenuto tramite la tecnica di decomposizione delle attività, pari a **130 ore/uomo**, coerente con le altre stime ottenute per dimensione e decomposizione del prodotto.

La produttività reale risulta significativamente superiore a quella stimata inizialmente, principalmente perché il codice di test (unitario, integrazione, end-to-end) rappresenta una parte rilevante del totale. Anche l’effort è stato superiore alle attese, ma il risultato è un codice più robusto e ben testato.