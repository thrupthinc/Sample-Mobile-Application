
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
25
26
27
28
29
30
31
32
33
34
35
36
37
38
39
40
41
42
43
44
45
46
47
48
49
50
51
52
53
54
55
56
57
58
59
60
61
62
63
64
65
66
67
68
69
70
71
72
73
74
75
76
77
78
79
80
81
82
83
84
85
86
87
88
89
90
91
92
93
94
95
96
97
98
99
100
101
102
103
104
105
106
107
108
109
110
111
112
113
114
115
116
117
118
119
120
121
122
123
124
125
126
127
128
129
130
131
132
133
134
135
136
137
138
139
140
141
142
143
144
145
146
147
148
149
150
151
152
153
154
155
156
157
158
159
160
161
162
163
164
165
166
167
168
169
170
171
172
173
174
175
176
177
178
179
180
181
182
183
184
185
186
187
188
189
190
191
192
193
194
195
196
197
198
199
200
201
202
203
204
205
206
207
208
209
210
211
212
213
214
215
216
217
218
219
220
221
222
223
224
225
226
227
228
229
230
231
232
233
234
235
236
237
238
239
240
241
242
243
244
245
246
247
248
249
250
251
252
253
254
255
256
257
258
259
260
261
262
263
264
265
266
267
268
269
270
271
272
273
274
275
276
277
278
279
280
281
282
283
284
285
286
287
288
289
290
291
292
293
294
295
296
297
298
299
300
301
302
303
304
305
306
307
308
309
310
311
312
313
314
315
316
317
318
319
320
321
322
323
324
325
326
327
328
329
330
331
332
333
334
335
336
337
338
339
340
341
342
343
344
345
346
347
348
349
350
351
352
353
354
355
356
357
358
359
360
361
362
363
364
365
366
367
368
369
370
371
372
373
374
375
376
377
378
379
380
381
382
383
384
385
386
387
388
389
390
391
392
393
394
395
396
397
398
399
400
401
402
403
404
405
406
407
408
409
410
411
412
413
414
415
416
417
418
419
420
421
422
423
424
425
426
427
428
429
430
431
432
433
434
435
436
437
438
439
440
441
442
443
444
445
446
447
448
449
450
451
452
453
454
455
456
457
458
459
460
461
462
463
464
465
466
467
468
469
470
471
472
473
474
475
476
477
478
479
480
481
482
483
484
485
486
487
488
489
490
491
492
493
494
495
496
497
498
499
500
501
502
503
504
505
506
507
508
509
510
511
512
513
514
515
516
517
518
519
520
521
522
523
524
525
526
527
528
529
530
531
532
533
534
535
536
537
538
539
540
541
542
543
544
545
546
547
548
549
550
551
552
553
554
555
556
557
558
559
560
561
562
563
564
565
566
567
568
569
570
571
572
573
574
575
576
577
578
579
580
581
582
583
584
585
586
587
588
589
590
591
592
593
594
595
596
597
598
599
600
601
602
603
604
605
606
607
608
609
610
611
612
613
614
615
616
617
618
619
620
621
622
623
624
625
626
627
628
629
630
631
632
633
634
635
636
637
638
639
640
641
642
643
644
645
646
647
648
649
650
651
652
653
654
655
656
657
658
659
660
661
662
663
664
665
666
667
668
669
670
671
672
673
674
675
676
677
678
679
680
681
682
683
684
685
686
687
688
689
690
691
692
693
694
695
696
697
698
699
700
701
702
703
704
705
706
707
708
709
710
711
712
713
714
715
716
717
718
719
720
721
722
723
724
725
726
727
728
729
730
731
732
733
734
735
736
737
738
739
740
741
742
743
744
745
746
747
748
749
750
751
752
753
754
755
756
757
758
759
760
761
762
763
764
765
766
767
768
769
770
771
772
773
774
775
776
777
778
779
780
781
782
783
784
785
786
787
788
789
790
791
792
793
794
795
796
797
798
799
800
801
802
803
804
805
806
807
808
809
810
811
812
813
814
815
816
817
818
819
820
821
822
823
824
825
826
827
828
829
830
831
832
833
834
835
836
837
838
839
840
841
842
843
844
845
846
847
848
849
850
851
852
853
854
855
856
857
858
859
860
861
862
863
864
865
866
867
868
869
870
871
872
873
874
875
876
877
878
879
880
881
882
883
884
885
886
887
888
889
890
891
892
893
894
895
896
897
898
899
900
901
902
903
904
905
906
907
908
909
910
911
912
913
914
915
916
917
918
919
920
921
922
923
924
925
926
927
928
929
930
931
932
933
934
935
936
937
938
939
940
941
942
943
944
945
946
947
948
949
950
951
952
953
954
955
956
957
958
959
960
961
962
963
964
965
966
967
968
969
970
971
972
973
974
975
976
977
978
979
980
981
982
983
984
985
986
987
988
989
990
991
992
993
994
995
996
997
998
999
1000
1001
1002
1003
1004
1005
1006
1007
1008
1009
1010
1011
1012
1013
1014
1015
1016
1017
1018
1019
1020
1021
1022
1023
1024
1025
1026
1027
1028
1029
1030
1031
1032
1033
1034
1035
1036
1037
1038
1039
1040
1041
1042
1043
1044
1045
1046
1047
1048
1049
1050
1051
1052
1053
1054
1055
1056
1057
1058
1059
1060
1061
1062
1063
1064
1065
1066
1067
1068
1069
1070
1071
1072
1073
1074
1075
1076
1077
1078
1079
1080
1081
1082
1083
1084
1085
1086
1087
1088
1089
1090
1091
1092
1093
1094
1095
1096
1097
1098
1099
1100
1101
1102
1103
1104
1105
1106
1107
1108
1109
1110
1111
1112
1113
1114
1115
1116
1117
1118
1119
1120
1121
1122
1123
1124
1125
1126
1127
1128
1129
1130
1131
1132
1133
1134
1135
1136
1137
1138
1139
1140
1141
1142
1143
1144
1145
1146
1147
1148
1149
1150
1151
1152
1153
1154
1155
1156
1157
1158
1159
1160
1161
1162
1163
1164
1165
1166
1167
1168
1169
1170
1171
1172
1173
1174
1175
1176
1177
1178
1179
1180
1181
1182
1183
1184
1185
1186
1187
1188
1189
1190
1191
1192
1193
1194
1195
1196
1197
1198
1199
1200
1201
1202
1203
1204
1205
1206
1207
1208
1209
1210
1211
1212
1213
1214
1215
1216
1217
1218
1219
1220
1221
1222
1223
1224
1225
1226
1227
1228
1229
1230
1231
1232
1233
1234
1235
1236
1237
1238
1239
1240
1241
1242
1243
1244
1245
1246
1247
1248
1249
1250
1251
1252
1253
1254
1255
1256
1257
1258
1259
1260
1261
1262
1263
1264
1265
1266
1267
1268
1269
1270
1271
1272
1273
1274
1275
1276
1277
1278
1279
1280
1281
1282
1283
1284
1285
1286
1287
1288
1289
1290
1291
1292
1293
1294
1295
1296
1297
1298
1299
1300
1301
1302
1303
1304
1305
1306
1307
1308
1309
1310
1311
1312
1313
1314
1315
1316
1317
1318
1319
1320
1321
1322
1323
1324
1325
1326
1327
1328
1329
1330
1331
1332
1333
1334
1335
1336
1337
1338
1339
1340
1341
1342
1343
1344
1345
1346
1347
1348
1349
1350
1351
1352
1353
1354
1355
1356
1357
1358
1359
1360
1361
1362
1363
1364
1365
1366
1367
1368
1369
1370
1371
1372
1373
1374
1375
1376
1377
1378
1379
1380
1381
1382
1383
1384
1385
1386
1387
1388
1389
1390
1391
1392
1393
1394
1395
1396
1397
1398
1399
1400
1401
1402
1403
1404
1405
1406
1407
1408
1409
1410
1411
1412
1413
1414
1415
1416
1417
1418
1419
1420
1421
1422
1423
1424
1425
1426
1427
1428
1429
1430
1431
1432
1433
1434
1435
1436
1437
1438
1439
1440
1441
1442
1443
1444
1445
1446
1447
1448
1449
1450
1451
1452
1453
1454
1455
1456
1457
1458
1459
1460
1461
1462
1463
1464
1465
1466
1467
1468
1469
1470
1471
1472
1473
1474
1475
1476
1477
1478
1479
1480
1481
1482
1483
1484
1485
1486
1487
1488
1489
1490
1491
1492
1493
1494
1495
1496
1497
1498
1499
1500
1501
1502
1503
1504
1505
1506
1507
1508
1509
1510
1511
1512
1513
1514
1515
1516
1517
1518
1519
1520
1521
1522
1523
1524
1525
1526
1527
1528
1529
1530
1531
1532
1533
1534
1535
1536
1537
1538
1539
1540
1541
1542
1543
1544
1545
1546
1547
1548
1549
1550
1551
1552
1553
1554
1555
1556
1557
1558
1559
1560
1561
1562
1563
1564
1565
1566
1567
1568
1569
1570
1571
1572
1573
1574
1575
1576
1577
1578
1579
1580
1581
1582
1583
1584
1585
1586
1587
1588
1589
1590
1591
1592
1593
1594
1595
1596
1597
1598
1599
1600
1601
1602
1603
1604
1605
1606
1607
1608
1609
1610
1611
1612
1613
1614
1615
1616
1617
1618
1619
1620
1621
1622
1623
1624
1625
1626
1627
1628
1629
1630
1631
1632
1633
1634
1635
1636
1637
1638
1639
1640
1641
1642
1643
1644
1645
1646
1647
1648
1649
1650
1651
1652
1653
1654
1655
1656
1657
1658
1659
1660
1661
1662
1663
1664
1665
1666
1667
1668
1669
1670
1671
1672
1673
1674
1675
1676
1677
1678
1679
1680
1681
1682
1683
1684
1685
1686
1687
1688
1689
1690
1691
1692
1693
1694
1695
1696
1697
1698
1699
1700
1701
1702
1703
1704
1705
1706
1707
1708
1709
1710
1711
1712
1713
1714
1715
1716
1717
1718
1719
1720
1721
1722
1723
1724
1725
1726
1727
1728
1729
1730
1731
1732
1733
1734
1735
1736
1737
1738
1739
1740
1741
1742
1743
1744
1745
1746
1747
1748
1749
1750
1751
1752
1753
1754
1755
1756
1757
1758
1759
1760
1761
1762
1763
1764
1765
1766
1767
1768
1769
1770
1771
1772
1773
1774
1775
1776
1777
1778
1779
1780
1781
1782
1783
1784
1785
1786
1787
1788
1789
1790
1791
1792
1793
1794
1795
1796
1797
1798
1799
1800
1801
1802
1803
1804
1805
1806
1807
1808
1809
1810
1811
1812
1813
1814
1815
1816
1817
1818
1819
1820
1821
1822
1823
1824
1825
1826
1827
1828
1829
1830
1831
1832
1833
1834
1835
1836
1837
1838
1839
1840
1841
1842
1843
1844
1845
1846
1847
1848
1849
1850
1851
1852
1853
1854
1855
1856
1857
1858
1859
1860
1861
1862
1863
1864
1865
1866
1867
1868
1869
1870
1871
1872
1873
1874
1875
1876
1877
1878
1879
1880
1881
1882
1883
1884
1885
1886
1887
1888
1889
1890
1891
1892
1893
1894
1895
1896
1897
1898
1899
1900
1901
1902
1903
1904
1905
1906
1907
1908
1909
1910
1911
1912
1913
1914
1915
1916
1917
1918
1919
1920
1921
1922
1923
1924
1925
1926
1927
1928
1929
1930
1931
1932
1933
1934
1935
1936
1937
1938
1939
1940
1941
1942
1943
1944
1945
1946
1947
1948
1949
1950
1951
1952
1953
1954
1955
1956
1957
1958
1959
1960
1961
1962
1963
1964
1965
1966
1967
1968
1969
1970
1971
1972
1973
1974
1975
1976
1977
1978
1979
1980
1981
1982
1983
1984
1985
1986
1987
1988
1989
1990
1991
1992
1993
1994
1995
1996
1997
1998
1999
2000
2001
2002
2003
2004
2005
2006
2007
2008
2009
2010
2011
2012
2013
2014
2015
2016
2017
2018
2019
2020
2021
2022
2023
2024
2025
2026
2027
2028
2029
2030
2031
2032
2033
2034
2035
2036
2037
2038
2039
2040
2041
2042
2043
2044
2045
2046
2047
2048
2049
2050
2051
2052
2053
2054
2055
2056
2057
2058
2059
2060
2061
2062
2063
2064
2065
2066
2067
2068
2069
2070
2071
2072
2073
2074
2075
2076
2077
2078
2079
2080
2081
2082
2083
2084
2085
2086
2087
2088
2089
2090
2091
2092
2093
2094
2095
2096
2097
2098
2099
2100
2101
2102
2103
2104
2105
2106
2107
2108
2109
2110
2111
2112
2113
2114
2115
2116
2117
2118
2119
2120
2121
2122
2123
2124
2125
2126
2127
2128
2129
2130
2131
2132
2133
2134
2135
2136
2137
2138
2139
2140
2141
2142
2143
2144
2145
2146
2147
2148
2149
2150
2151
2152
2153
2154
2155
2156
2157
2158
2159
2160
2161
2162
2163
2164
2165
2166
2167
2168
2169
2170
2171
2172
2173
2174
2175
2176
2177
2178
2179
2180
2181
2182
2183
2184
2185
2186
2187
2188
2189
2190
2191
2192
2193
2194
2195
2196
2197
2198
2199
2200
2201
2202
2203
2204
2205
2206
2207
2208
2209
2210
2211
2212
2213
2214
2215
2216
2217
2218
2219
2220
2221
2222
2223
2224
2225
2226
2227
2228
2229
2230
2231
2232
2233
2234
2235
2236
2237
2238
2239
2240
2241
2242
2243
2244
2245
2246
2247
2248
2249
2250
2251
2252
2253
2254
2255
2256
2257
2258
2259
2260
2261
2262
2263
2264
2265
2266
2267
2268
2269
2270
2271
2272
2273
2274
2275
2276
2277
2278
2279
2280
2281
2282
2283
2284
2285
2286
2287
2288
2289
2290
2291
2292
2293
2294
2295
2296
2297
2298
2299
2300
2301
2302
2303
2304
2305
2306
2307
2308
2309
2310
2311
2312
2313
2314
2315
2316
2317
2318
2319
2320
2321
2322
2323
2324
2325
2326
2327
2328
2329
2330
2331
2332
2333
2334
2335
2336
2337
2338
2339
2340
2341
2342
2343
2344
2345
2346
2347
2348
2349
2350
2351
2352
2353
2354
2355
2356
2357
2358
2359
2360
2361
2362
2363
2364
2365
2366
2367
2368
2369
2370
2371
2372
2373
2374
2375
2376
2377
2378
2379
2380
2381
2382
2383
2384
2385
2386
2387
2388
2389
2390
2391
2392
2393
2394
2395
2396
2397
2398
2399
2400
2401
2402
2403
2404
2405
2406
2407
2408
2409
2410
2411
2412
2413
2414
2415
2416
2417
2418
2419
2420
2421
2422
2423
2424
2425
2426
2427
2428
2429
2430
2431
2432
2433
2434
2435
2436
2437
2438
2439
2440
2441
2442
2443
2444
2445
2446
2447
2448
2449
2450
2451
2452
2453
2454
2455
2456
2457
2458
2459
2460
2461
2462
2463
2464
2465
2466
2467
2468
2469
2470
2471
2472
2473
2474
2475
2476
2477
2478
2479
2480
2481
2482
2483
2484
2485
2486
2487
2488
2489
2490
2491
2492
2493
2494
2495
2496
2497
2498
2499
2500
2501
2502
2503
2504
2505
2506
2507
2508
2509
2510
2511
2512
2513
2514
2515
2516
2517
2518
2519
2520
2521
2522
2523
2524
2525
2526
2527
2528
2529
2530
2531
2532
2533
2534
2535
2536
2537
2538
2539
2540
2541
2542
2543
2544
2545
2546
2547
2548
2549
2550
2551
2552
2553
2554
2555
2556
2557
2558
2559
2560
2561
2562
2563
2564
2565
2566
2567
2568
2569
2570
2571
2572
2573
2574
2575
2576
2577
2578
2579
2580
2581
2582
2583
2584
2585
2586
2587
2588
2589
2590
2591
2592
2593
2594
2595
2596
2597
2598
2599
2600
2601
2602
2603
2604
2605
2606
2607
2608
2609
2610
2611
2612
2613
2614
2615
2616
2617
2618
2619
2620
2621
2622
2623
2624
2625
2626
2627
2628
2629
2630
2631
2632
2633
2634
2635
2636
2637
2638
2639
2640
2641
2642
2643
2644
2645
2646
2647
2648
2649
2650
2651
2652
2653
2654
2655
2656
2657
2658
2659
2660
2661
2662
2663
2664
2665
2666
2667
2668
2669
2670
2671
2672
2673
2674
2675
2676
2677
2678
2679
2680
2681
2682
2683
2684
2685
2686
2687
2688
2689
2690
2691
2692
2693
2694
2695
2696
2697
2698
2699
2700
2701
2702
2703
2704
2705
2706
2707
2708
2709
2710
2711
2712
2713
2714
2715
2716
2717
2718
2719
2720
2721
2722
2723
2724
2725
2726
2727
2728
2729
2730
2731
2732
2733
2734
2735
2736
2737
2738
2739
2740
2741
2742
2743
2744
2745
2746
2747
2748
2749
2750
2751
2752
2753
2754
2755
2756
2757
2758
2759
2760
2761
2762
2763
2764
2765
2766
2767
2768
2769
2770
2771
2772
2773
2774
2775
2776
2777
2778
2779
2780
2781
2782
2783
2784
2785
2786
2787
2788
2789
2790
2791
2792
2793
2794
2795
2796
2797
2798
2799
2800
2801
2802
2803
2804
2805
2806
2807
2808
2809
2810
2811
2812
2813
2814
2815
2816
2817
2818
2819
2820
2821
2822
2823
2824
2825
2826
2827
2828
2829
2830
2831
2832
2833
2834
2835
2836
2837
2838
2839
2840
2841
2842
2843
2844
2845
2846
2847
2848
2849
2850
2851
2852
2853
2854
2855
2856
2857
2858
2859
2860
2861
2862
2863
2864
2865
2866
2867
2868
2869
2870
2871
2872
2873
2874
2875
2876
2877
2878
2879
2880
2881
2882
2883
2884
2885
2886
2887
2888
2889
2890
2891
2892
2893
2894
2895
2896
2897
2898
2899
2900
2901
2902
2903
2904
2905
2906
2907
2908
2909
2910
2911
2912
2913
2914
2915
2916
2917
2918
2919
2920
2921
2922
2923
2924
2925
2926
2927
2928
2929
2930
2931
2932
2933
2934
2935
2936
2937
2938
2939
2940
2941
2942
2943
2944
2945
2946
2947
2948
2949
2950
2951
2952
2953
2954
2955
2956
2957
2958
2959
2960
2961
2962
2963
2964
2965
2966
2967
2968
2969
2970
2971
2972
2973
2974
2975
2976
2977
2978
2979
2980
2981
2982
2983
2984
2985
2986
2987
2988
2989
2990
2991
2992
2993
2994
2995
2996
2997
2998
2999
3000
3001
3002
3003
3004
3005
3006
3007
3008
3009
3010
3011
3012
3013
3014
3015
3016
3017
3018
3019
3020
3021
3022
3023
3024
3025
3026
3027
3028
3029
3030
3031
3032
3033
3034
3035
3036
3037
3038
3039
3040
3041
3042
3043
3044
3045
3046
3047
3048
3049
3050
3051
3052
3053
3054
3055
3056
3057
3058
3059
3060
3061
3062
3063
3064
3065
3066
3067
3068
3069
3070
3071
3072
3073
3074
3075
3076
3077
3078
3079
3080
3081
3082
3083
3084
3085
3086
3087
3088
3089
3090
3091
3092
3093
3094
3095
3096
3097
3098
3099
3100
3101
3102
3103
3104
3105
3106
3107
3108
3109
3110
3111
3112
3113
3114
3115
3116
3117
3118
3119
3120
3121
3122
3123
3124
3125
3126
3127
3128
3129
3130
3131
3132
3133
3134
3135
3136
3137
3138
3139
3140
3141
3142
3143
3144
3145
3146
3147
3148
3149
3150
3151
3152
3153
3154
3155
3156
3157
3158
3159
3160
3161
3162
3163
3164
3165
3166
3167
3168
3169
3170
3171
3172
3173
3174
3175
3176
3177
3178
3179
3180
3181
3182
3183
3184
3185
3186
3187
3188
3189
3190
3191
3192
3193
3194
3195
3196
3197
3198
3199
3200
3201
3202
3203
3204
3205
3206
3207
3208
3209
3210
3211
3212
3213
3214
3215
3216
3217
3218
3219
3220
3221
3222
3223
3224
3225
3226
3227
3228
3229
3230
3231
3232
3233
3234
3235
3236
3237
3238
3239
3240
3241
3242
3243
3244
3245
3246
3247
3248
3249
3250
3251
3252
3253
3254
3255
3256
3257
3258
3259
3260
3261
3262
3263
3264
3265
3266
3267
3268
3269
3270
3271
3272
3273
3274
3275
3276
3277
3278
3279
3280
3281
3282
3283
3284
3285
3286
3287
3288
3289
3290
3291
3292
3293
3294
3295
3296
3297
3298
3299
3300
3301
3302
3303
3304
3305
3306
3307
3308
3309
3310
3311
3312
3313
3314
3315
3316
3317
3318
3319
3320
3321
3322
3323
3324
3325
3326
3327
3328
3329
3330
3331
3332
3333
3334
3335
3336
3337
3338
3339
3340
3341
3342
3343
3344
3345
3346
3347
3348
3349
3350
3351
3352
3353
3354
3355
3356
3357
3358
3359
3360
3361
3362
3363
3364
3365
3366
3367
3368
3369
3370
3371
3372
3373
3374
3375
3376
3377
3378
3379
3380
3381
3382
3383
3384
3385
3386
3387
3388
3389
3390
3391
3392
3393
3394
3395
3396
3397
3398
3399
3400
3401
3402
3403
3404
3405
3406
3407
3408
3409
3410
3411
3412
3413
3414
3415
3416
3417
3418
3419
3420
3421
3422
3423
3424
3425
3426
3427
3428
3429
3430
3431
3432
3433
3434
3435
3436
3437
3438
3439
3440
3441
3442
3443
3444
3445
3446
3447
3448
3449
3450
3451
3452
3453
3454
3455
3456
3457
3458
3459
3460
3461
3462
3463
3464
3465
3466
3467
3468
3469
3470
3471
3472
3473
3474
3475
3476
3477
3478
3479
3480
3481
3482
3483
3484
3485
3486
3487
3488
3489
3490
3491
3492
3493
3494
3495
3496
3497
3498
3499
3500
3501
3502
3503
3504
3505
3506
3507
3508
3509
3510
3511
3512
3513
3514
3515
3516
3517
3518
3519
3520
3521
3522
3523
3524
3525
3526
3527
3528
3529
3530
3531
3532
3533
3534
3535
3536
3537
3538
3539
3540
3541
3542
3543
3544
3545
3546
3547
3548
3549
3550
3551
3552
3553
3554
3555
3556
3557
3558
3559
3560
3561
3562
3563
3564
3565
3566
3567
3568
3569
3570
3571
3572
3573
3574
3575
3576
3577
3578
3579
3580
3581
3582
3583
3584
3585
3586
3587
3588
3589
3590
3591
3592
3593
3594
3595
3596
3597
3598
3599
3600
3601
3602
3603
3604
3605
3606
3607
3608
3609
3610
3611
3612
3613
3614
3615
3616
3617
3618
3619
3620
3621
3622
3623
3624
3625
3626
3627
3628
3629
3630
3631
3632
3633
3634
3635
3636
3637
3638
3639
3640
3641
3642
3643
3644
3645
3646
3647
3648
3649
3650
3651
3652
3653
3654
3655
3656
3657
3658
3659
3660
3661
3662
3663
3664
3665
3666
3667
3668
3669
3670
3671
3672
3673
3674
3675
3676
3677
3678
3679
3680
3681
3682
3683
3684
3685
3686
3687
3688
3689
3690
3691
3692
3693
3694
3695
3696
3697
3698
3699
3700
3701
3702
3703
3704
3705
3706
3707
3708
3709
3710
3711
3712
3713
3714
3715
3716
3717
3718
3719
3720
3721
3722
3723
3724
3725
3726
3727
3728
3729
3730
3731
3732
3733
3734
3735
3736
3737
3738
3739
3740
3741
3742
3743
3744
3745
3746
3747
3748
3749
3750
3751
3752
3753
3754
3755
3756
3757
3758
3759
3760
3761
3762
3763
3764
3765
3766
3767
3768
3769
3770
3771
3772
3773
3774
3775
3776
3777
3778
3779
3780
3781
3782
3783
3784
3785
3786
3787
3788
3789
3790
3791
3792
3793
3794
3795
3796
3797
3798
3799
3800
3801
3802
3803
3804
3805
3806
3807
3808
3809
3810
3811
3812
3813
3814
3815
3816
3817
3818
3819
3820
3821
3822
3823
3824
3825
3826
3827
3828
3829
3830
3831
3832
3833
3834
3835
3836
3837
3838
3839
3840
3841
3842
3843
3844
3845
3846
3847
3848
3849
3850
3851
3852
3853
3854
3855
3856
3857
3858
3859
3860
3861
3862
3863
3864
3865
3866
3867
3868
3869
3870
3871
3872
3873
3874
3875
3876
3877
3878
3879
3880
3881
3882
3883
3884
3885
3886
3887
3888
3889
3890
3891
3892
3893
3894
3895
3896
3897
3898
3899
3900
3901
3902
3903
3904
3905
3906
3907
3908
3909
3910
3911
3912
3913
3914
3915
3916
3917
3918
3919
3920
3921
3922
3923
3924
3925
3926
3927
3928
3929
3930
3931
3932
3933
3934
3935
3936
3937
3938
3939
3940
3941
3942
3943
3944
3945
3946
3947
3948
3949
3950
3951
3952
3953
3954
3955
3956
3957
3958
3959
3960
3961
3962
3963
3964
3965
3966
3967
3968
3969
3970
3971
3972
3973
3974
3975
3976
3977
3978
3979
3980
3981
3982
3983
3984
3985
3986
3987
3988
3989
3990
3991
3992
3993
3994
3995
3996
3997
3998
3999
4000
4001
4002
4003
4004
4005
4006
4007
4008
4009
4010
4011
4012
4013
4014
4015
4016
4017
4018
4019
4020
4021
4022
4023
4024
4025
4026
4027
4028
4029
4030
4031
4032
4033
4034
4035
4036
4037
4038
4039
4040
4041
4042
4043
4044
4045
4046
4047
4048
4049
4050
4051
4052
4053
4054
4055
4056
4057
4058
4059
4060
4061
4062
4063
4064
4065
4066
4067
4068
4069
4070
4071
4072
4073
4074
4075
4076
4077
4078
4079
4080
4081
4082
4083
4084
4085
4086
4087
4088
4089
4090
4091
4092
4093
4094
4095
4096
4097
4098
4099
4100
4101
4102
4103
4104
4105
4106
4107
4108
4109
4110
4111
4112
4113
4114
4115
4116
4117
4118
4119
4120
4121
4122
4123
4124
4125
4126
4127
4128
4129
4130
4131
4132
4133
4134
4135
4136
4137
4138
4139
4140
4141
4142
4143
4144
4145
4146
4147
4148
4149
4150
4151
4152
4153
4154
4155
4156
4157
4158
4159
4160
4161
4162
4163
4164
4165
4166
4167
4168
4169
4170
4171
4172
4173
4174
4175
4176
4177
4178
4179
4180
4181
4182
4183
4184
4185
4186
4187
4188
4189
4190
4191
4192
4193
4194
4195
4196
4197
4198
4199
4200
4201
4202
4203
4204
4205
4206
4207
4208
4209
4210
4211
4212
4213
4214
4215
4216
4217
4218
4219
4220
4221
4222
4223
4224
4225
4226
4227
4228
4229
4230
4231
4232
4233
4234
4235
4236
4237
4238
4239
4240
4241
4242
4243
4244
4245
4246
4247
4248
4249
4250
4251
4252
4253
4254
4255
4256
4257
4258
4259
4260
4261
4262
4263
4264
4265
4266
4267
4268
4269
4270
4271
4272
4273
4274
4275
4276
4277
4278
4279
4280
4281
4282
4283
4284
4285
4286
4287
4288
4289
4290
4291
4292
4293
4294
4295
4296
4297
4298
4299
4300
4301
4302
4303
4304
4305
4306
4307
4308
4309
4310
4311
4312
4313
4314
4315
4316
4317
4318
4319
4320
4321
4322
4323
4324
4325
4326
4327
4328
4329
4330
4331
4332
4333
4334
4335
4336
4337
4338
4339
4340
4341
4342
4343
4344
4345
4346
4347
4348
4349
4350
4351
4352
4353
4354
4355
4356
4357
4358
4359
4360
4361
4362
4363
4364
4365
4366
4367
4368
4369
4370
4371
4372
4373
4374
4375
4376
4377
4378
4379
4380
4381
4382
4383
4384
4385
4386
4387
4388
4389
4390
4391
4392
4393
4394
4395
4396
4397
4398
4399
4400
4401
4402
4403
4404
4405
4406
4407
4408
4409
4410
4411
4412
4413
4414
4415
4416
4417
4418
4419
4420
4421
4422
4423
4424
4425
4426
4427
4428
4429
4430
4431
4432
4433
4434
4435
4436
4437
4438
4439
4440
4441
4442
4443
4444
4445
4446
4447
4448
4449
4450
4451
4452
4453
4454
4455
4456
4457
4458
4459
4460
4461
4462
4463
4464
4465
4466
4467
4468
4469
4470
4471
4472
4473
4474
4475
4476
4477
4478
4479
4480
4481
4482
4483
4484
4485
4486
4487
4488
4489
4490
4491
4492
4493
4494
4495
4496
4497
4498
4499
4500
4501
4502
4503
4504
4505
4506
4507
4508
4509
4510
4511
4512
4513
4514
4515
4516
4517
4518
4519
4520
4521
4522
4523
4524
4525
4526
4527
4528
4529
4530
4531
4532
4533
4534
4535
4536
4537
4538
4539
4540
4541
4542
4543
4544
4545
4546
4547
4548
4549
4550
4551
4552
4553
4554
4555
4556
4557
4558
4559
4560
4561
4562
4563
4564
4565
4566
4567
4568
4569
4570
4571
4572
4573
4574
4575
4576
4577
4578
4579
4580
4581
4582
4583
4584
4585
4586
4587
4588
4589
4590
4591
4592
4593
4594
4595
4596
4597
4598
4599
4600
4601
4602
4603
4604
4605
4606
4607
4608
4609
4610
4611
4612
4613
4614
4615
4616
4617
4618
4619
4620
4621
4622
4623
4624
4625
4626
4627
4628
4629
4630
4631
4632
4633
4634
4635
4636
/*
 *     Licensed to the Apache Software Foundation (ASF) under one
 *     or more contributor license agreements.  See the NOTICE file
 *     distributed with this work for additional information
 *     regarding copyright ownership.  The ASF licenses this file
 *     to you under the Apache License, Version 2.0 (the
 *     "License"); you may not use this file except in compliance
 *     with the License.  You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing,
 *     software distributed under the License is distributed on an
 *     "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *     KIND, either express or implied.  See the License for the
 *     specific language governing permissions and limitations
 *     under the License.
 */

// Version 1.2.0

if (typeof PhoneGap === "undefined") {

/**
 * The order of events during page load and PhoneGap startup is as follows:
 *
 * onDOMContentLoaded         Internal event that is received when the web page is loaded and parsed.
 * window.onload              Body onload event.
 * onNativeReady              Internal event that indicates the PhoneGap native side is ready.
 * onPhoneGapInit             Internal event that kicks off creation of all PhoneGap JavaScript objects (runs constructors).
 * onPhoneGapReady            Internal event fired when all PhoneGap JavaScript objects have been created
 * onPhoneGapInfoReady        Internal event fired when device properties are available
 * onDeviceReady              User event fired to indicate that PhoneGap is ready
 * onResume                   User event fired to indicate a start/resume lifecycle event
 * onPause                    User event fired to indicate a pause lifecycle event
 * onDestroy                  Internal event fired when app is being destroyed (User should use window.onunload event, not this one).
 *
 * The only PhoneGap events that user code should register for are:
 *      deviceready           PhoneGap native code is initialized and PhoneGap APIs can be called from JavaScript
 *      pause                 App has moved to background
 *      resume                App has returned to foreground
 *
 * Listeners can be registered as:
 *      document.addEventListener("deviceready", myDeviceReadyListener, false);
 *      document.addEventListener("resume", myResumeListener, false);
 *      document.addEventListener("pause", myPauseListener, false);
 *
 * The DOM lifecycle events should be used for saving and restoring state
 *      window.onload
 *      window.onunload
 */

/**
 * This represents the PhoneGap API itself, and provides a global namespace for accessing
 * information about the state of PhoneGap.
 * @class
 */
var PhoneGap = {
    documentEventHandler: {},   // Collection of custom document event handlers
    windowEventHandler: {}      // Collection of custom window event handlers
};

/**
 * List of resource files loaded by PhoneGap.
 * This is used to ensure JS and other files are loaded only once.
 */
PhoneGap.resources = {base: true};

/**
 * Determine if resource has been loaded by PhoneGap
 *
 * @param name
 * @return
 */
PhoneGap.hasResource = function(name) {
    return PhoneGap.resources[name];
};

/**
 * Add a resource to list of loaded resources by PhoneGap
 *
 * @param name
 */
PhoneGap.addResource = function(name) {
    PhoneGap.resources[name] = true;
};

/**
 * Custom pub-sub channel that can have functions subscribed to it
 * @constructor
 */
PhoneGap.Channel = function (type)
{
    this.type = type;
    this.handlers = {};
    this.guid = 0;
    this.fired = false;
    this.enabled = true;
};

/**
 * Subscribes the given function to the channel. Any time that
 * Channel.fire is called so too will the function.
 * Optionally specify an execution context for the function
 * and a guid that can be used to stop subscribing to the channel.
 * Returns the guid.
 */
PhoneGap.Channel.prototype.subscribe = function(f, c, g) {
    // need a function to call
    if (f === null) { return; }

    var func = f;
    if (typeof c === "object" && typeof f === "function") { func = PhoneGap.close(c, f); }

    g = g || func.observer_guid || f.observer_guid || this.guid++;
    func.observer_guid = g;
    f.observer_guid = g;
    this.handlers[g] = func;
    return g;
};

/**
 * Like subscribe but the function is only called once and then it
 * auto-unsubscribes itself.
 */
PhoneGap.Channel.prototype.subscribeOnce = function(f, c) {
    var g = null;
    var _this = this;
    var m = function() {
        f.apply(c || null, arguments);
        _this.unsubscribe(g);
    };
    if (this.fired) {
        if (typeof c === "object" && typeof f === "function") { f = PhoneGap.close(c, f); }
        f.apply(this, this.fireArgs);
    } else {
        g = this.subscribe(m);
    }
    return g;
};

/**
 * Unsubscribes the function with the given guid from the channel.
 */
PhoneGap.Channel.prototype.unsubscribe = function(g) {
    if (typeof g === "function") { g = g.observer_guid; }
    this.handlers[g] = null;
    delete this.handlers[g];
};

/**
 * Calls all functions subscribed to this channel.
 */
PhoneGap.Channel.prototype.fire = function(e) {
    if (this.enabled) {
        var fail = false;
        var item, handler, rv;
        for (item in this.handlers) {
            if (this.handlers.hasOwnProperty(item)) {
                handler = this.handlers[item];
                if (typeof handler === "function") {
                    rv = (handler.apply(this, arguments) === false);
                    fail = fail || rv;
                }
            }
        }
        this.fired = true;
        this.fireArgs = arguments;
        return !fail;
    }
    return true;
};

/**
 * Calls the provided function only after all of the channels specified
 * have been fired.
 */
PhoneGap.Channel.join = function(h, c) {
    var i = c.length;
    var f = function() {
        if (!(--i)) {
            h();
        }
    };
    var len = i;
    var j;
    for (j=0; j<len; j++) {
        if (!c[j].fired) {
            c[j].subscribeOnce(f);
        }
        else {
            i--;
        }
    }
    if (!i) {
        h();
    }
};

/**
 * Add an initialization function to a queue that ensures it will run and initialize
 * application constructors only once PhoneGap has been initialized.
 * @param {Function} func The function callback you want run once PhoneGap is initialized
 */
PhoneGap.addConstructor = function(func) {
    PhoneGap.onPhoneGapInit.subscribeOnce(function() {
        try {
            func();
        } catch(e) {
            console.log("Failed to run constructor: " + e);
        }
    });
};

/**
 * Plugins object
 */
if (!window.plugins) {
    window.plugins = {};
}

/**
 * Adds a plugin object to window.plugins.
 * The plugin is accessed using window.plugins.<name>
 *
 * @param name          The plugin name
 * @param obj           The plugin object
 */
PhoneGap.addPlugin = function(name, obj) {
    if (!window.plugins[name]) {
        window.plugins[name] = obj;
    }
    else {
        console.log("Error: Plugin "+name+" already exists.");
    }
};

/**
 * onDOMContentLoaded channel is fired when the DOM content
 * of the page has been parsed.
 */
PhoneGap.onDOMContentLoaded = new PhoneGap.Channel('onDOMContentLoaded');

/**
 * onNativeReady channel is fired when the PhoneGap native code
 * has been initialized.
 */
PhoneGap.onNativeReady = new PhoneGap.Channel('onNativeReady');

/**
 * onPhoneGapInit channel is fired when the web page is fully loaded and
 * PhoneGap native code has been initialized.
 */
PhoneGap.onPhoneGapInit = new PhoneGap.Channel('onPhoneGapInit');

/**
 * onPhoneGapReady channel is fired when the JS PhoneGap objects have been created.
 */
PhoneGap.onPhoneGapReady = new PhoneGap.Channel('onPhoneGapReady');

/**
 * onPhoneGapInfoReady channel is fired when the PhoneGap device properties
 * has been set.
 */
PhoneGap.onPhoneGapInfoReady = new PhoneGap.Channel('onPhoneGapInfoReady');

/**
 * onPhoneGapConnectionReady channel is fired when the PhoneGap connection properties
 * has been set.
 */
PhoneGap.onPhoneGapConnectionReady = new PhoneGap.Channel('onPhoneGapConnectionReady');

/**
 * onDestroy channel is fired when the PhoneGap native code
 * is destroyed.  It is used internally.
 * Window.onunload should be used by the user.
 */
PhoneGap.onDestroy = new PhoneGap.Channel('onDestroy');
PhoneGap.onDestroy.subscribeOnce(function() {
    PhoneGap.shuttingDown = true;
});
PhoneGap.shuttingDown = false;

// _nativeReady is global variable that the native side can set
// to signify that the native code is ready. It is a global since
// it may be called before any PhoneGap JS is ready.
if (typeof _nativeReady !== 'undefined') { PhoneGap.onNativeReady.fire(); }

/**
 * onDeviceReady is fired only after all PhoneGap objects are created and
 * the device properties are set.
 */
PhoneGap.onDeviceReady = new PhoneGap.Channel('onDeviceReady');


// Array of channels that must fire before "deviceready" is fired
PhoneGap.deviceReadyChannelsArray = [ PhoneGap.onPhoneGapReady, PhoneGap.onPhoneGapInfoReady, PhoneGap.onPhoneGapConnectionReady];

// Hashtable of user defined channels that must also fire before "deviceready" is fired
PhoneGap.deviceReadyChannelsMap = {};

/**
 * Indicate that a feature needs to be initialized before it is ready to be used.
 * This holds up PhoneGap's "deviceready" event until the feature has been initialized
 * and PhoneGap.initComplete(feature) is called.
 *
 * @param feature {String}     The unique feature name
 */
PhoneGap.waitForInitialization = function(feature) {
    if (feature) {
        var channel = new PhoneGap.Channel(feature);
        PhoneGap.deviceReadyChannelsMap[feature] = channel;
        PhoneGap.deviceReadyChannelsArray.push(channel);
    }
};

/**
 * Indicate that initialization code has completed and the feature is ready to be used.
 *
 * @param feature {String}     The unique feature name
 */
PhoneGap.initializationComplete = function(feature) {
    var channel = PhoneGap.deviceReadyChannelsMap[feature];
    if (channel) {
        channel.fire();
    }
};

/**
 * Create all PhoneGap objects once page has fully loaded and native side is ready.
 */
PhoneGap.Channel.join(function() {

    // Start listening for XHR callbacks
    setTimeout(function() {
            if (PhoneGap.UsePolling) {
                PhoneGap.JSCallbackPolling();
            }
            else {
                var polling = prompt("usePolling", "gap_callbackServer:");
                PhoneGap.UsePolling = polling;
                if (polling == "true") {
                    PhoneGap.UsePolling = true;
                    PhoneGap.JSCallbackPolling();
                }
                else {
                    PhoneGap.UsePolling = false;
                    PhoneGap.JSCallback();
                }
            }
        }, 1);

    // Run PhoneGap constructors
    PhoneGap.onPhoneGapInit.fire();

    // Fire event to notify that all objects are created
    PhoneGap.onPhoneGapReady.fire();

    // Fire onDeviceReady event once all constructors have run and PhoneGap info has been
    // received from native side, and any user defined initialization channels.
    PhoneGap.Channel.join(function() {
        // Let native code know we are inited on JS side
        prompt("", "gap_init:");

        PhoneGap.onDeviceReady.fire();
    }, PhoneGap.deviceReadyChannelsArray);

}, [ PhoneGap.onDOMContentLoaded, PhoneGap.onNativeReady ]);

// Listen for DOMContentLoaded and notify our channel subscribers
document.addEventListener('DOMContentLoaded', function() {
    PhoneGap.onDOMContentLoaded.fire();
}, false);

// Intercept calls to document.addEventListener and watch for deviceready
PhoneGap.m_document_addEventListener = document.addEventListener;

// Intercept calls to window.addEventListener
PhoneGap.m_window_addEventListener = window.addEventListener;

/**
 * Add a custom window event handler.
 *
 * @param {String} event            The event name that callback handles
 * @param {Function} callback       The event handler
 */
PhoneGap.addWindowEventHandler = function(event, callback) {
    PhoneGap.windowEventHandler[event] = callback;
};

/**
 * Add a custom document event handler.
 *
 * @param {String} event            The event name that callback handles
 * @param {Function} callback       The event handler
 */
PhoneGap.addDocumentEventHandler = function(event, callback) {
    PhoneGap.documentEventHandler[event] = callback;
};

/**
 * Intercept adding document event listeners and handle our own
 *
 * @param {Object} evt
 * @param {Function} handler
 * @param capture
 */
document.addEventListener = function(evt, handler, capture) {
    var e = evt.toLowerCase();
    if (e === 'deviceready') {
        PhoneGap.onDeviceReady.subscribeOnce(handler);
    }
    else {
        // If subscribing to Android backbutton
        if (e === 'backbutton') {
            PhoneGap.exec(null, null, "App", "overrideBackbutton", [true]);
        }
        
        // If subscribing to an event that is handled by a plugin
        else if (typeof PhoneGap.documentEventHandler[e] !== "undefined") {
            if (PhoneGap.documentEventHandler[e](e, handler, true)) {
                return; // Stop default behavior
            }
        }
        
        PhoneGap.m_document_addEventListener.call(document, evt, handler, capture);
    }
};

/**
 * Intercept adding window event listeners and handle our own
 *
 * @param {Object} evt
 * @param {Function} handler
 * @param capture
 */
window.addEventListener = function(evt, handler, capture) {
    var e = evt.toLowerCase();
        
    // If subscribing to an event that is handled by a plugin
    if (typeof PhoneGap.windowEventHandler[e] !== "undefined") {
        if (PhoneGap.windowEventHandler[e](e, handler, true)) {
            return; // Stop default behavior
        }
    }
        
    PhoneGap.m_window_addEventListener.call(window, evt, handler, capture);
};

// Intercept calls to document.removeEventListener and watch for events that
// are generated by PhoneGap native code
PhoneGap.m_document_removeEventListener = document.removeEventListener;

// Intercept calls to window.removeEventListener
PhoneGap.m_window_removeEventListener = window.removeEventListener;

/**
 * Intercept removing document event listeners and handle our own
 *
 * @param {Object} evt
 * @param {Function} handler
 * @param capture
 */
document.removeEventListener = function(evt, handler, capture) {
    var e = evt.toLowerCase();

    // If unsubscribing to Android backbutton
    if (e === 'backbutton') {
        PhoneGap.exec(null, null, "App", "overrideBackbutton", [false]);
    }

    // If unsubcribing from an event that is handled by a plugin
    if (typeof PhoneGap.documentEventHandler[e] !== "undefined") {
        if (PhoneGap.documentEventHandler[e](e, handler, false)) {
            return; // Stop default behavior
        }
    }

    PhoneGap.m_document_removeEventListener.call(document, evt, handler, capture);
};

/**
 * Intercept removing window event listeners and handle our own
 *
 * @param {Object} evt
 * @param {Function} handler
 * @param capture
 */
window.removeEventListener = function(evt, handler, capture) {
    var e = evt.toLowerCase();

    // If unsubcribing from an event that is handled by a plugin
    if (typeof PhoneGap.windowEventHandler[e] !== "undefined") {
        if (PhoneGap.windowEventHandler[e](e, handler, false)) {
            return; // Stop default behavior
        }
    }

    PhoneGap.m_window_removeEventListener.call(window, evt, handler, capture);
};

/**
 * Method to fire document event
 *
 * @param {String} type             The event type to fire
 * @param {Object} data             Data to send with event
 */
PhoneGap.fireDocumentEvent = function(type, data) {
    var e = document.createEvent('Events');
    e.initEvent(type);
    if (data) {
        for (var i in data) {
            e[i] = data[i];
        }
    }
    document.dispatchEvent(e);
};

/**
 * Method to fire window event
 *
 * @param {String} type             The event type to fire
 * @param {Object} data             Data to send with event
 */
PhoneGap.fireWindowEvent = function(type, data) {
    var e = document.createEvent('Events');
    e.initEvent(type);
    if (data) {
        for (var i in data) {
            e[i] = data[i];
        }
    }
    window.dispatchEvent(e);
};

/**
 * Does a deep clone of the object.
 *
 * @param obj
 * @return {Object}
 */
PhoneGap.clone = function(obj) {
    var i, retVal;
    if(!obj) { 
        return obj;
    }
    
    if(obj instanceof Array){
        retVal = [];
        for(i = 0; i < obj.length; ++i){
            retVal.push(PhoneGap.clone(obj[i]));
        }
        return retVal;
    }
    
    if (typeof obj === "function") {
        return obj;
    }
    
    if(!(obj instanceof Object)){
        return obj;
    }
    
    if (obj instanceof Date) {
        return obj;
    }
    
    retVal = {};
    for(i in obj){
        if(!(i in retVal) || retVal[i] !== obj[i]) {
            retVal[i] = PhoneGap.clone(obj[i]);
        }
    }
    return retVal;
};

PhoneGap.callbackId = 0;
PhoneGap.callbacks = {};
PhoneGap.callbackStatus = {
    NO_RESULT: 0,
    OK: 1,
    CLASS_NOT_FOUND_EXCEPTION: 2,
    ILLEGAL_ACCESS_EXCEPTION: 3,
    INSTANTIATION_EXCEPTION: 4,
    MALFORMED_URL_EXCEPTION: 5,
    IO_EXCEPTION: 6,
    INVALID_ACTION: 7,
    JSON_EXCEPTION: 8,
    ERROR: 9
    };


/**
 * Execute a PhoneGap command.  It is up to the native side whether this action is synch or async.
 * The native side can return:
 *      Synchronous: PluginResult object as a JSON string
 *      Asynchrounous: Empty string ""
 * If async, the native side will PhoneGap.callbackSuccess or PhoneGap.callbackError,
 * depending upon the result of the action.
 *
 * @param {Function} success    The success callback
 * @param {Function} fail       The fail callback
 * @param {String} service      The name of the service to use
 * @param {String} action       Action to be run in PhoneGap
 * @param {Array.<String>} [args]     Zero or more arguments to pass to the method
 */
PhoneGap.exec = function(success, fail, service, action, args) {
    try {
        var callbackId = service + PhoneGap.callbackId++;
        if (success || fail) {
            PhoneGap.callbacks[callbackId] = {success:success, fail:fail};
        }

        var r = prompt(JSON.stringify(args), "gap:"+JSON.stringify([service, action, callbackId, true]));

        // If a result was returned
        if (r.length > 0) {
            eval("var v="+r+";");

            // If status is OK, then return value back to caller
            if (v.status === PhoneGap.callbackStatus.OK) {

                // If there is a success callback, then call it now with
                // returned value
                if (success) {
                    try {
                        success(v.message);
                    } catch (e) {
                        console.log("Error in success callback: " + callbackId  + " = " + e);
                    }

                    // Clear callback if not expecting any more results
                    if (!v.keepCallback) {
                        delete PhoneGap.callbacks[callbackId];
                    }
                }
                return v.message;
            }

            // If no result
            else if (v.status === PhoneGap.callbackStatus.NO_RESULT) {

                // Clear callback if not expecting any more results
                if (!v.keepCallback) {
                    delete PhoneGap.callbacks[callbackId];
                }
            }

            // If error, then display error
            else {
                console.log("Error: Status="+v.status+" Message="+v.message);

                // If there is a fail callback, then call it now with returned value
                if (fail) {
                    try {
                        fail(v.message);
                    }
                    catch (e1) {
                        console.log("Error in error callback: "+callbackId+" = "+e1);
                    }

                    // Clear callback if not expecting any more results
                    if (!v.keepCallback) {
                        delete PhoneGap.callbacks[callbackId];
                    }
                }
                return null;
            }
        }
    } catch (e2) {
        console.log("Error: "+e2);
    }
};

/**
 * Called by native code when returning successful result from an action.
 *
 * @param callbackId
 * @param args
 */
PhoneGap.callbackSuccess = function(callbackId, args) {
    if (PhoneGap.callbacks[callbackId]) {

        // If result is to be sent to callback
        if (args.status === PhoneGap.callbackStatus.OK) {
            try {
                if (PhoneGap.callbacks[callbackId].success) {
                    PhoneGap.callbacks[callbackId].success(args.message);
                }
            }
            catch (e) {
                console.log("Error in success callback: "+callbackId+" = "+e);
            }
        }

        // Clear callback if not expecting any more results
        if (!args.keepCallback) {
            delete PhoneGap.callbacks[callbackId];
        }
    }
};

/**
 * Called by native code when returning error result from an action.
 *
 * @param callbackId
 * @param args
 */
PhoneGap.callbackError = function(callbackId, args) {
    if (PhoneGap.callbacks[callbackId]) {
        try {
            if (PhoneGap.callbacks[callbackId].fail) {
                PhoneGap.callbacks[callbackId].fail(args.message);
            }
        }
        catch (e) {
            console.log("Error in error callback: "+callbackId+" = "+e);
        }

        // Clear callback if not expecting any more results
        if (!args.keepCallback) {
            delete PhoneGap.callbacks[callbackId];
        }
    }
};

PhoneGap.JSCallbackPort = null;
PhoneGap.JSCallbackToken = null;

/**
 * This is only for Android.
 *
 * Internal function that uses XHR to call into PhoneGap Java code and retrieve
 * any JavaScript code that needs to be run.  This is used for callbacks from
 * Java to JavaScript.
 */
PhoneGap.JSCallback = function() {

    // Exit if shutting down app
    if (PhoneGap.shuttingDown) {
        return;
    }

    // If polling flag was changed, start using polling from now on
    if (PhoneGap.UsePolling) {
        PhoneGap.JSCallbackPolling();
        return;
    }

    var xmlhttp = new XMLHttpRequest();

    // Callback function when XMLHttpRequest is ready
    xmlhttp.onreadystatechange=function(){
        if(xmlhttp.readyState === 4){

            // Exit if shutting down app
            if (PhoneGap.shuttingDown) {
                return;
            }

            // If callback has JavaScript statement to execute
            if (xmlhttp.status === 200) {

                // Need to url decode the response
                var msg = decodeURIComponent(xmlhttp.responseText);
                setTimeout(function() {
                    try {
                        var t = eval(msg);
                    }
                    catch (e) {
                        // If we're getting an error here, seeing the message will help in debugging
                        console.log("JSCallback: Message from Server: " + msg);
                        console.log("JSCallback Error: "+e);
                    }
                }, 1);
                setTimeout(PhoneGap.JSCallback, 1);
            }

            // If callback ping (used to keep XHR request from timing out)
            else if (xmlhttp.status === 404) {
                setTimeout(PhoneGap.JSCallback, 10);
            }

            // If security error
            else if (xmlhttp.status === 403) {
                console.log("JSCallback Error: Invalid token.  Stopping callbacks.");
            }

            // If server is stopping
            else if (xmlhttp.status === 503) {
                console.log("JSCallback Server Closed: Stopping callbacks.");
            }

            // If request wasn't GET
            else if (xmlhttp.status === 400) {
                console.log("JSCallback Error: Bad request.  Stopping callbacks.");
            }

            // If error, revert to polling
            else {
                console.log("JSCallback Error: Request failed.");
                PhoneGap.UsePolling = true;
                PhoneGap.JSCallbackPolling();
            }
        }
    };

    if (PhoneGap.JSCallbackPort === null) {
        PhoneGap.JSCallbackPort = prompt("getPort", "gap_callbackServer:");
    }
    if (PhoneGap.JSCallbackToken === null) {
        PhoneGap.JSCallbackToken = prompt("getToken", "gap_callbackServer:");
    }
    xmlhttp.open("GET", "http://127.0.0.1:"+PhoneGap.JSCallbackPort+"/"+PhoneGap.JSCallbackToken , true);
    xmlhttp.send();
};

/**
 * The polling period to use with JSCallbackPolling.
 * This can be changed by the application.  The default is 50ms.
 */
PhoneGap.JSCallbackPollingPeriod = 50;

/**
 * Flag that can be set by the user to force polling to be used or force XHR to be used.
 */
PhoneGap.UsePolling = false;    // T=use polling, F=use XHR

/**
 * This is only for Android.
 *
 * Internal function that uses polling to call into PhoneGap Java code and retrieve
 * any JavaScript code that needs to be run.  This is used for callbacks from
 * Java to JavaScript.
 */
PhoneGap.JSCallbackPolling = function() {

    // Exit if shutting down app
    if (PhoneGap.shuttingDown) {
        return;
    }

    // If polling flag was changed, stop using polling from now on
    if (!PhoneGap.UsePolling) {
        PhoneGap.JSCallback();
        return;
    }

    var msg = prompt("", "gap_poll:");
    if (msg) {
        setTimeout(function() {
            try {
                var t = eval(""+msg);
            }
            catch (e) {
                console.log("JSCallbackPolling: Message from Server: " + msg);
                console.log("JSCallbackPolling Error: "+e);
            }
        }, 1);
        setTimeout(PhoneGap.JSCallbackPolling, 1);
    }
    else {
        setTimeout(PhoneGap.JSCallbackPolling, PhoneGap.JSCallbackPollingPeriod);
    }
};

/**
 * Create a UUID
 *
 * @return {String}
 */
PhoneGap.createUUID = function() {
    return PhoneGap.UUIDcreatePart(4) + '-' +
        PhoneGap.UUIDcreatePart(2) + '-' +
        PhoneGap.UUIDcreatePart(2) + '-' +
        PhoneGap.UUIDcreatePart(2) + '-' +
        PhoneGap.UUIDcreatePart(6);
};

PhoneGap.UUIDcreatePart = function(length) {
    var uuidpart = "";
    var i, uuidchar;
    for (i=0; i<length; i++) {
        uuidchar = parseInt((Math.random() * 256),0).toString(16);
        if (uuidchar.length === 1) {
            uuidchar = "0" + uuidchar;
        }
        uuidpart += uuidchar;
    }
    return uuidpart;
};

PhoneGap.close = function(context, func, params) {
    if (typeof params === 'undefined') {
        return function() {
            return func.apply(context, arguments);
        };
    } else {
        return function() {
            return func.apply(context, params);
        };
    }
};

/**
 * Load a JavaScript file after page has loaded.
 *
 * @param {String} jsfile               The url of the JavaScript file to load.
 * @param {Function} successCallback    The callback to call when the file has been loaded.
 */
PhoneGap.includeJavascript = function(jsfile, successCallback) {
    var id = document.getElementsByTagName("head")[0];
    var el = document.createElement('script');
    el.type = 'text/javascript';
    if (typeof successCallback === 'function') {
        el.onload = successCallback;
    }
    el.src = jsfile;
    id.appendChild(el);
};

}
/*
 *     Licensed to the Apache Software Foundation (ASF) under one
 *     or more contributor license agreements.  See the NOTICE file
 *     distributed with this work for additional information
 *     regarding copyright ownership.  The ASF licenses this file
 *     to you under the Apache License, Version 2.0 (the
 *     "License"); you may not use this file except in compliance
 *     with the License.  You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing,
 *     software distributed under the License is distributed on an
 *     "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *     KIND, either express or implied.  See the License for the
 *     specific language governing permissions and limitations
 *     under the License.
 */

if (!PhoneGap.hasResource("device")) {
PhoneGap.addResource("device");

/**
 * This represents the mobile device, and provides properties for inspecting the model, version, UUID of the
 * phone, etc.
 * @constructor
 */
var Device = function() {
    this.available = PhoneGap.available;
    this.platform = null;
    this.version = null;
    this.name = null;
    this.uuid = null;
    this.phonegap = null;

    var me = this;
    this.getInfo(
        function(info) {
            me.available = true;
            me.platform = info.platform;
            me.version = info.version;
            me.name = info.name;
            me.uuid = info.uuid;
            me.phonegap = info.phonegap;
            PhoneGap.onPhoneGapInfoReady.fire();
        },
        function(e) {
            me.available = false;
            console.log("Error initializing PhoneGap: " + e);
            alert("Error initializing PhoneGap: "+e);
        });
};

/**
 * Get device info
 *
 * @param {Function} successCallback The function to call when the heading data is available
 * @param {Function} errorCallback The function to call when there is an error getting the heading data. (OPTIONAL)
 */
Device.prototype.getInfo = function(successCallback, errorCallback) {

    // successCallback required
    if (typeof successCallback !== "function") {
        console.log("Device Error: successCallback is not a function");
        return;
    }

    // errorCallback optional
    if (errorCallback && (typeof errorCallback !== "function")) {
        console.log("Device Error: errorCallback is not a function");
        return;
    }

    // Get info
    PhoneGap.exec(successCallback, errorCallback, "Device", "getDeviceInfo", []);
};

/*
 * DEPRECATED
 * This is only for Android.
 *
 * You must explicitly override the back button.
 */
Device.prototype.overrideBackButton = function() {
	console.log("Device.overrideBackButton() is deprecated.  Use App.overrideBackbutton(true).");
	navigator.app.overrideBackbutton(true);
};

/*
 * DEPRECATED
 * This is only for Android.
 *
 * This resets the back button to the default behaviour
 */
Device.prototype.resetBackButton = function() {
	console.log("Device.resetBackButton() is deprecated.  Use App.overrideBackbutton(false).");
	navigator.app.overrideBackbutton(false);
};

/*
 * DEPRECATED
 * This is only for Android.
 *
 * This terminates the activity!
 */
Device.prototype.exitApp = function() {
	console.log("Device.exitApp() is deprecated.  Use App.exitApp().");
	navigator.app.exitApp();
};

PhoneGap.addConstructor(function() {
    if (typeof navigator.device === "undefined") {
        navigator.device = window.device = new Device();
    }
});
}
/*
 *     Licensed to the Apache Software Foundation (ASF) under one
 *     or more contributor license agreements.  See the NOTICE file
 *     distributed with this work for additional information
 *     regarding copyright ownership.  The ASF licenses this file
 *     to you under the Apache License, Version 2.0 (the
 *     "License"); you may not use this file except in compliance
 *     with the License.  You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing,
 *     software distributed under the License is distributed on an
 *     "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *     KIND, either express or implied.  See the License for the
 *     specific language governing permissions and limitations
 *     under the License.
 */

if (!PhoneGap.hasResource("accelerometer")) {
PhoneGap.addResource("accelerometer");

/** @constructor */
var Acceleration = function(x, y, z) {
  this.x = x;
  this.y = y;
  this.z = z;
  this.timestamp = new Date().getTime();
};

/**
 * This class provides access to device accelerometer data.
 * @constructor
 */
var Accelerometer = function() {

    /**
     * The last known acceleration.  type=Acceleration()
     */
    this.lastAcceleration = null;

    /**
     * List of accelerometer watch timers
     */
    this.timers = {};
};

Accelerometer.ERROR_MSG = ["Not running", "Starting", "", "Failed to start"];

/**
 * Asynchronously aquires the current acceleration.
 *
 * @param {Function} successCallback    The function to call when the acceleration data is available
 * @param {Function} errorCallback      The function to call when there is an error getting the acceleration data. (OPTIONAL)
 * @param {AccelerationOptions} options The options for getting the accelerometer data such as timeout. (OPTIONAL)
 */
Accelerometer.prototype.getCurrentAcceleration = function(successCallback, errorCallback, options) {

    // successCallback required
    if (typeof successCallback !== "function") {
        console.log("Accelerometer Error: successCallback is not a function");
        return;
    }

    // errorCallback optional
    if (errorCallback && (typeof errorCallback !== "function")) {
        console.log("Accelerometer Error: errorCallback is not a function");
        return;
    }

    // Get acceleration
    PhoneGap.exec(successCallback, errorCallback, "Accelerometer", "getAcceleration", []);
};

/**
 * Asynchronously aquires the acceleration repeatedly at a given interval.
 *
 * @param {Function} successCallback    The function to call each time the acceleration data is available
 * @param {Function} errorCallback      The function to call when there is an error getting the acceleration data. (OPTIONAL)
 * @param {AccelerationOptions} options The options for getting the accelerometer data such as timeout. (OPTIONAL)
 * @return String                       The watch id that must be passed to #clearWatch to stop watching.
 */
Accelerometer.prototype.watchAcceleration = function(successCallback, errorCallback, options) {

    // Default interval (10 sec)
    var frequency = (options !== undefined)? options.frequency : 10000;

    // successCallback required
    if (typeof successCallback !== "function") {
        console.log("Accelerometer Error: successCallback is not a function");
        return;
    }

    // errorCallback optional
    if (errorCallback && (typeof errorCallback !== "function")) {
        console.log("Accelerometer Error: errorCallback is not a function");
        return;
    }

    // Make sure accelerometer timeout > frequency + 10 sec
    PhoneGap.exec(
        function(timeout) {
            if (timeout < (frequency + 10000)) {
                PhoneGap.exec(null, null, "Accelerometer", "setTimeout", [frequency + 10000]);
            }
        },
        function(e) { }, "Accelerometer", "getTimeout", []);

    // Start watch timer
    var id = PhoneGap.createUUID();
    navigator.accelerometer.timers[id] = setInterval(function() {
        PhoneGap.exec(successCallback, errorCallback, "Accelerometer", "getAcceleration", []);
    }, (frequency ? frequency : 1));

    return id;
};

/**
 * Clears the specified accelerometer watch.
 *
 * @param {String} id       The id of the watch returned from #watchAcceleration.
 */
Accelerometer.prototype.clearWatch = function(id) {

    // Stop javascript timer & remove from timer list
    if (id && navigator.accelerometer.timers[id] !== undefined) {
        clearInterval(navigator.accelerometer.timers[id]);
        delete navigator.accelerometer.timers[id];
    }
};

PhoneGap.addConstructor(function() {
    if (typeof navigator.accelerometer === "undefined") {
        navigator.accelerometer = new Accelerometer();
    }
});
}
/*
 *     Licensed to the Apache Software Foundation (ASF) under one
 *     or more contributor license agreements.  See the NOTICE file
 *     distributed with this work for additional information
 *     regarding copyright ownership.  The ASF licenses this file
 *     to you under the Apache License, Version 2.0 (the
 *     "License"); you may not use this file except in compliance
 *     with the License.  You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing,
 *     software distributed under the License is distributed on an
 *     "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *     KIND, either express or implied.  See the License for the
 *     specific language governing permissions and limitations
 *     under the License.
 */

if (!PhoneGap.hasResource("app")) {
PhoneGap.addResource("app");
(function() {

/**
 * Constructor
 * @constructor
 */
var App = function() {};

/**
 * Clear the resource cache.
 */
App.prototype.clearCache = function() {
    PhoneGap.exec(null, null, "App", "clearCache", []);
};

/**
 * Load the url into the webview or into new browser instance.
 *
 * @param url           The URL to load
 * @param props         Properties that can be passed in to the activity:
 *      wait: int                           => wait msec before loading URL
 *      loadingDialog: "Title,Message"      => display a native loading dialog
 *      loadUrlTimeoutValue: int            => time in msec to wait before triggering a timeout error
 *      clearHistory: boolean              => clear webview history (default=false)
 *      openExternal: boolean              => open in a new browser (default=false)
 *
 * Example:
 *      navigator.app.loadUrl("http://server/myapp/index.html", {wait:2000, loadingDialog:"Wait,Loading App", loadUrlTimeoutValue: 60000});
 */
App.prototype.loadUrl = function(url, props) {
    PhoneGap.exec(null, null, "App", "loadUrl", [url, props]);
};

/**
 * Cancel loadUrl that is waiting to be loaded.
 */
App.prototype.cancelLoadUrl = function() {
    PhoneGap.exec(null, null, "App", "cancelLoadUrl", []);
};

/**
 * Clear web history in this web view.
 * Instead of BACK button loading the previous web page, it will exit the app.
 */
App.prototype.clearHistory = function() {
    PhoneGap.exec(null, null, "App", "clearHistory", []);
};

/**
 * Go to previous page displayed.
 * This is the same as pressing the backbutton on Android device.
 */
App.prototype.backHistory = function() {
    PhoneGap.exec(null, null, "App", "backHistory", []);
};

/**
 * Override the default behavior of the Android back button.
 * If overridden, when the back button is pressed, the "backKeyDown" JavaScript event will be fired.
 *
 * Note: The user should not have to call this method.  Instead, when the user
 *       registers for the "backbutton" event, this is automatically done.
 *
 * @param override		T=override, F=cancel override
 */
App.prototype.overrideBackbutton = function(override) {
    PhoneGap.exec(null, null, "App", "overrideBackbutton", [override]);
};

/**
 * Exit and terminate the application.
 */
App.prototype.exitApp = function() {
	return PhoneGap.exec(null, null, "App", "exitApp", []);
};

PhoneGap.addConstructor(function() {
    navigator.app = new App();
});
}());
}
/*
 *     Licensed to the Apache Software Foundation (ASF) under one
 *     or more contributor license agreements.  See the NOTICE file
 *     distributed with this work for additional information
 *     regarding copyright ownership.  The ASF licenses this file
 *     to you under the Apache License, Version 2.0 (the
 *     "License"); you may not use this file except in compliance
 *     with the License.  You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing,
 *     software distributed under the License is distributed on an
 *     "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *     KIND, either express or implied.  See the License for the
 *     specific language governing permissions and limitations
 *     under the License.
 */

if (!PhoneGap.hasResource("battery")) {
PhoneGap.addResource("battery");

/**
 * This class contains information about the current battery status.
 * @constructor
 */
var Battery = function() {
    this._level = null;
    this._isPlugged = null;
    this._batteryListener = [];
    this._lowListener = [];
    this._criticalListener = [];
};

/**
 * Registers as an event producer for battery events.
 * 
 * @param {Object} eventType
 * @param {Object} handler
 * @param {Object} add
 */
Battery.prototype.eventHandler = function(eventType, handler, add) {
    var me = navigator.battery;
    if (add) {
        // If there are no current registered event listeners start the battery listener on native side.
        if (me._batteryListener.length === 0 && me._lowListener.length === 0 && me._criticalListener.length === 0) {
            PhoneGap.exec(me._status, me._error, "Battery", "start", []);
        }
        
        // Register the event listener in the proper array
        if (eventType === "batterystatus") {
            if (me._batteryListener.indexOf(handler) === -1) {
                me._batteryListener.push(handler);
            }
        } else if (eventType === "batterylow") {
            if (me._lowListener.indexOf(handler) === -1) {
                me._lowListener.push(handler);
            }
        } else if (eventType === "batterycritical") {
            if (me._criticalListener.indexOf(handler) === -1) {
                me._criticalListener.push(handler);
            }
        }
    } else {
        var pos = -1;
        // Remove the event listener from the proper array
        if (eventType === "batterystatus") {
            pos = me._batteryListener.indexOf(handler);
            if (pos > -1) {
                me._batteryListener.splice(pos, 1);        
            }
        } else if (eventType === "batterylow") {
            pos = me._lowListener.indexOf(handler);
            if (pos > -1) {
                me._lowListener.splice(pos, 1);        
            }
        } else if (eventType === "batterycritical") {
            pos = me._criticalListener.indexOf(handler);
            if (pos > -1) {
                me._criticalListener.splice(pos, 1);        
            }
        }
        
        // If there are no more registered event listeners stop the battery listener on native side.
        if (me._batteryListener.length === 0 && me._lowListener.length === 0 && me._criticalListener.length === 0) {
            PhoneGap.exec(null, null, "Battery", "stop", []);
        }
    }
};

/**
 * Callback for battery status
 * 
 * @param {Object} info			keys: level, isPlugged
 */
Battery.prototype._status = function(info) {
	if (info) {
		var me = this;
        var level = info.level;
		if (me._level !== level || me._isPlugged !== info.isPlugged) {
			// Fire batterystatus event
			PhoneGap.fireWindowEvent("batterystatus", info);

			// Fire low battery event
			if (level === 20 || level === 5) {
				if (level === 20) {
					PhoneGap.fireWindowEvent("batterylow", info);
				}
				else {
					PhoneGap.fireWindowEvent("batterycritical", info);
				}
			}
		}
		me._level = level;
		me._isPlugged = info.isPlugged;	
	}
};

/**
 * Error callback for battery start
 */
Battery.prototype._error = function(e) {
    console.log("Error initializing Battery: " + e);
};

PhoneGap.addConstructor(function() {
    if (typeof navigator.battery === "undefined") {
        navigator.battery = new Battery();
        PhoneGap.addWindowEventHandler("batterystatus", navigator.battery.eventHandler);
        PhoneGap.addWindowEventHandler("batterylow", navigator.battery.eventHandler);
        PhoneGap.addWindowEventHandler("batterycritical", navigator.battery.eventHandler);
    }
});
}
/*
 *     Licensed to the Apache Software Foundation (ASF) under one
 *     or more contributor license agreements.  See the NOTICE file
 *     distributed with this work for additional information
 *     regarding copyright ownership.  The ASF licenses this file
 *     to you under the Apache License, Version 2.0 (the
 *     "License"); you may not use this file except in compliance
 *     with the License.  You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing,
 *     software distributed under the License is distributed on an
 *     "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *     KIND, either express or implied.  See the License for the
 *     specific language governing permissions and limitations
 *     under the License.
 */

if (!PhoneGap.hasResource("camera")) {
PhoneGap.addResource("camera");

/**
 * This class provides access to the device camera.
 *
 * @constructor
 */
var Camera = function() {
    this.successCallback = null;
    this.errorCallback = null;
    this.options = null;
};

/**
 * Format of image that returned from getPicture.
 *
 * Example: navigator.camera.getPicture(success, fail,
 *              { quality: 80,
 *                destinationType: Camera.DestinationType.DATA_URL,
 *                sourceType: Camera.PictureSourceType.PHOTOLIBRARY})
 */
Camera.DestinationType = {
    DATA_URL: 0,                // Return base64 encoded string
    FILE_URI: 1                 // Return file uri (content://media/external/images/media/2 for Android)
};
Camera.prototype.DestinationType = Camera.DestinationType;

/**
 * Encoding of image returned from getPicture.
 *
 * Example: navigator.camera.getPicture(success, fail,
 *              { quality: 80,
 *                destinationType: Camera.DestinationType.DATA_URL,
 *                sourceType: Camera.PictureSourceType.CAMERA,
 *                encodingType: Camera.EncodingType.PNG})
*/
Camera.EncodingType = {
    JPEG: 0,                    // Return JPEG encoded image
    PNG: 1                      // Return PNG encoded image
};
Camera.prototype.EncodingType = Camera.EncodingType;

/**
 * Type of pictures to select from.  Only applicable when
 *      PictureSourceType is PHOTOLIBRARY or SAVEDPHOTOALBUM
 *
 * Example: navigator.camera.getPicture(success, fail,
 *              { quality: 80,
 *                destinationType: Camera.DestinationType.DATA_URL,
 *                sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
 *                mediaType: Camera.MediaType.PICTURE})
 */
Camera.MediaType = {
       PICTURE: 0,      // allow selection of still pictures only. DEFAULT. Will return format specified via DestinationType
       VIDEO: 1,        // allow selection of video only, ONLY RETURNS URL
       ALLMEDIA : 2     // allow selection from all media types
};
Camera.prototype.MediaType = Camera.MediaType;


/**
 * Source to getPicture from.
 *
 * Example: navigator.camera.getPicture(success, fail,
 *              { quality: 80,
 *                destinationType: Camera.DestinationType.DATA_URL,
 *                sourceType: Camera.PictureSourceType.PHOTOLIBRARY})
 */
Camera.PictureSourceType = {
    PHOTOLIBRARY : 0,           // Choose image from picture library (same as SAVEDPHOTOALBUM for Android)
    CAMERA : 1,                 // Take picture from camera
    SAVEDPHOTOALBUM : 2         // Choose image from picture library (same as PHOTOLIBRARY for Android)
};
Camera.prototype.PictureSourceType = Camera.PictureSourceType;

/**
 * Gets a picture from source defined by "options.sourceType", and returns the
 * image as defined by the "options.destinationType" option.

 * The defaults are sourceType=CAMERA and destinationType=DATA_URL.
 *
 * @param {Function} successCallback
 * @param {Function} errorCallback
 * @param {Object} options
 */
Camera.prototype.getPicture = function(successCallback, errorCallback, options) {

    // successCallback required
    if (typeof successCallback !== "function") {
        console.log("Camera Error: successCallback is not a function");
        return;
    }

    // errorCallback optional
    if (errorCallback && (typeof errorCallback !== "function")) {
        console.log("Camera Error: errorCallback is not a function");
        return;
    }
    
    if (options === null || typeof options === "undefined") {
        options = {};
    }
    if (options.quality === null || typeof options.quality === "undefined") {
        options.quality = 80;
    }
    if (options.maxResolution === null || typeof options.maxResolution === "undefined") {
        options.maxResolution = 0;
    }
    if (options.destinationType === null || typeof options.destinationType === "undefined") {
        options.destinationType = Camera.DestinationType.DATA_URL;
    }
    if (options.sourceType === null || typeof options.sourceType === "undefined") {
        options.sourceType = Camera.PictureSourceType.CAMERA;
    }
    if (options.encodingType === null || typeof options.encodingType === "undefined") {
        options.encodingType = Camera.EncodingType.JPEG;
    }
    if (options.mediaType === null || typeof options.mediaType === "undefined") {
        options.mediaType = Camera.MediaType.PICTURE;
    }
    if (options.targetWidth === null || typeof options.targetWidth === "undefined") {
        options.targetWidth = -1;
    } 
    else if (typeof options.targetWidth === "string") {
        var width = new Number(options.targetWidth);
        if (isNaN(width) === false) {
            options.targetWidth = width.valueOf();
        }
    }
    if (options.targetHeight === null || typeof options.targetHeight === "undefined") {
        options.targetHeight = -1;
    } 
    else if (typeof options.targetHeight === "string") {
        var height = new Number(options.targetHeight);
        if (isNaN(height) === false) {
            options.targetHeight = height.valueOf();
        }
    }
    
    PhoneGap.exec(successCallback, errorCallback, "Camera", "takePicture", [options]);
};

PhoneGap.addConstructor(function() {
    if (typeof navigator.camera === "undefined") {
        navigator.camera = new Camera();
    }
});
}
/*
 *     Licensed to the Apache Software Foundation (ASF) under one
 *     or more contributor license agreements.  See the NOTICE file
 *     distributed with this work for additional information
 *     regarding copyright ownership.  The ASF licenses this file
 *     to you under the Apache License, Version 2.0 (the
 *     "License"); you may not use this file except in compliance
 *     with the License.  You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing,
 *     software distributed under the License is distributed on an
 *     "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *     KIND, either express or implied.  See the License for the
 *     specific language governing permissions and limitations
 *     under the License.
 */

if (!PhoneGap.hasResource("capture")) {
PhoneGap.addResource("capture");
	
/**
 * Represents a single file.
 *
 * name {DOMString} name of the file, without path information
 * fullPath {DOMString} the full path of the file, including the name
 * type {DOMString} mime type
 * lastModifiedDate {Date} last modified date
 * size {Number} size of the file in bytes
 */
var MediaFile = function(name, fullPath, type, lastModifiedDate, size){
	this.name = name || null;
	this.fullPath = fullPath || null;
	this.type = type || null;
	this.lastModifiedDate = lastModifiedDate || null;
	this.size = size || 0;
};

/**
 * Launch device camera application for recording video(s).
 *
 * @param {Function} successCB
 * @param {Function} errorCB
 */
MediaFile.prototype.getFormatData = function(successCallback, errorCallback){
	PhoneGap.exec(successCallback, errorCallback, "Capture", "getFormatData", [this.fullPath, this.type]);
};

/**
 * MediaFileData encapsulates format information of a media file.
 *
 * @param {DOMString} codecs
 * @param {long} bitrate
 * @param {long} height
 * @param {long} width
 * @param {float} duration
 */
var MediaFileData = function(codecs, bitrate, height, width, duration){
	this.codecs = codecs || null;
	this.bitrate = bitrate || 0;
	this.height = height || 0;
	this.width = width || 0;
	this.duration = duration || 0;
};

/**
 * The CaptureError interface encapsulates all errors in the Capture API.
 */
var CaptureError = function(){
	this.code = null;
};

// Capture error codes
CaptureError.CAPTURE_INTERNAL_ERR = 0;
CaptureError.CAPTURE_APPLICATION_BUSY = 1;
CaptureError.CAPTURE_INVALID_ARGUMENT = 2;
CaptureError.CAPTURE_NO_MEDIA_FILES = 3;
CaptureError.CAPTURE_NOT_SUPPORTED = 20;

/**
 * The Capture interface exposes an interface to the camera and microphone of the hosting device.
 */
var Capture = function(){
	this.supportedAudioModes = [];
	this.supportedImageModes = [];
	this.supportedVideoModes = [];
};

/**
 * Launch audio recorder application for recording audio clip(s).
 *
 * @param {Function} successCB
 * @param {Function} errorCB
 * @param {CaptureAudioOptions} options
 */
Capture.prototype.captureAudio = function(successCallback, errorCallback, options){
	PhoneGap.exec(successCallback, errorCallback, "Capture", "captureAudio", [options]);
};

/**
 * Launch camera application for taking image(s).
 *
 * @param {Function} successCB
 * @param {Function} errorCB
 * @param {CaptureImageOptions} options
 */
Capture.prototype.captureImage = function(successCallback, errorCallback, options){
	PhoneGap.exec(successCallback, errorCallback, "Capture", "captureImage", [options]);
};

/**
 * Launch camera application for taking image(s).
 *
 * @param {Function} successCB
 * @param {Function} errorCB
 * @param {CaptureImageOptions} options
 */
Capture.prototype._castMediaFile = function(pluginResult){
	var mediaFiles = [];
	var i;
	for (i = 0; i < pluginResult.message.length; i++) {
		var mediaFile = new MediaFile();
		mediaFile.name = pluginResult.message[i].name;
		mediaFile.fullPath = pluginResult.message[i].fullPath;
		mediaFile.type = pluginResult.message[i].type;
		mediaFile.lastModifiedDate = pluginResult.message[i].lastModifiedDate;
		mediaFile.size = pluginResult.message[i].size;
		mediaFiles.push(mediaFile);
	}
	pluginResult.message = mediaFiles;
	return pluginResult;
};

/**
 * Launch device camera application for recording video(s).
 *
 * @param {Function} successCB
 * @param {Function} errorCB
 * @param {CaptureVideoOptions} options
 */
Capture.prototype.captureVideo = function(successCallback, errorCallback, options){
	PhoneGap.exec(successCallback, errorCallback, "Capture", "captureVideo", [options]);
};

/**
 * Encapsulates a set of parameters that the capture device supports.
 */
var ConfigurationData = function(){
	// The ASCII-encoded string in lower case representing the media type. 
	this.type = null;
	// The height attribute represents height of the image or video in pixels. 
	// In the case of a sound clip this attribute has value 0. 
	this.height = 0;
	// The width attribute represents width of the image or video in pixels. 
	// In the case of a sound clip this attribute has value 0
	this.width = 0;
};

/**
 * Encapsulates all image capture operation configuration options.
 */
var CaptureImageOptions = function(){
	// Upper limit of images user can take. Value must be equal or greater than 1.
	this.limit = 1;
	// The selected image mode. Must match with one of the elements in supportedImageModes array.
	this.mode = null;
};

/**
 * Encapsulates all video capture operation configuration options.
 */
var CaptureVideoOptions = function(){
	// Upper limit of videos user can record. Value must be equal or greater than 1.
	this.limit = 1;
	// Maximum duration of a single video clip in seconds.
	this.duration = 0;
	// The selected video mode. Must match with one of the elements in supportedVideoModes array.
	this.mode = null;
};

/**
 * Encapsulates all audio capture operation configuration options.
 */
var CaptureAudioOptions = function(){
	// Upper limit of sound clips user can record. Value must be equal or greater than 1.
	this.limit = 1;
	// Maximum duration of a single sound clip in seconds.
	this.duration = 0;
	// The selected audio mode. Must match with one of the elements in supportedAudioModes array.
	this.mode = null;
};

PhoneGap.addConstructor(function(){
	if (typeof navigator.device.capture === "undefined") {
		navigator.device.capture = window.device.capture = new Capture();
	}
});
}
/*
 *     Licensed to the Apache Software Foundation (ASF) under one
 *     or more contributor license agreements.  See the NOTICE file
 *     distributed with this work for additional information
 *     regarding copyright ownership.  The ASF licenses this file
 *     to you under the Apache License, Version 2.0 (the
 *     "License"); you may not use this file except in compliance
 *     with the License.  You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing,
 *     software distributed under the License is distributed on an
 *     "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *     KIND, either express or implied.  See the License for the
 *     specific language governing permissions and limitations
 *     under the License.
 */

if (!PhoneGap.hasResource("compass")) {
PhoneGap.addResource("compass");

var CompassError = function(){
    this.code = null;
};

// Capture error codes
CompassError.COMPASS_INTERNAL_ERR = 0;
CompassError.COMPASS_NOT_SUPPORTED = 20;

var CompassHeading = function() {
    this.magneticHeading = null;
    this.trueHeading = null;
    this.headingAccuracy = null;
    this.timestamp = null;
};

/**
 * This class provides access to device Compass data.
 * @constructor
 */
var Compass = function() {
    /**
     * The last known Compass position.
     */
    this.lastHeading = null;

    /**
     * List of compass watch timers
     */
    this.timers = {};
};

Compass.ERROR_MSG = ["Not running", "Starting", "", "Failed to start"];

/**
 * Asynchronously aquires the current heading.
 *
 * @param {Function} successCallback The function to call when the heading data is available
 * @param {Function} errorCallback The function to call when there is an error getting the heading data. (OPTIONAL)
 * @param {PositionOptions} options The options for getting the heading data such as timeout. (OPTIONAL)
 */
Compass.prototype.getCurrentHeading = function(successCallback, errorCallback, options) {

    // successCallback required
    if (typeof successCallback !== "function") {
        console.log("Compass Error: successCallback is not a function");
        return;
    }

    // errorCallback optional
    if (errorCallback && (typeof errorCallback !== "function")) {
        console.log("Compass Error: errorCallback is not a function");
        return;
    }

    // Get heading
    PhoneGap.exec(successCallback, errorCallback, "Compass", "getHeading", []);
};

/**
 * Asynchronously aquires the heading repeatedly at a given interval.
 *
 * @param {Function} successCallback    The function to call each time the heading data is available
 * @param {Function} errorCallback      The function to call when there is an error getting the heading data. (OPTIONAL)
 * @param {HeadingOptions} options      The options for getting the heading data such as timeout and the frequency of the watch. (OPTIONAL)
 * @return String                       The watch id that must be passed to #clearWatch to stop watching.
 */
Compass.prototype.watchHeading= function(successCallback, errorCallback, options) {

    // Default interval (100 msec)
    var frequency = (options !== undefined) ? options.frequency : 100;

    // successCallback required
    if (typeof successCallback !== "function") {
        console.log("Compass Error: successCallback is not a function");
        return;
    }

    // errorCallback optional
    if (errorCallback && (typeof errorCallback !== "function")) {
        console.log("Compass Error: errorCallback is not a function");
        return;
    }

    // Make sure compass timeout > frequency + 10 sec
    PhoneGap.exec(
        function(timeout) {
            if (timeout < (frequency + 10000)) {
                PhoneGap.exec(null, null, "Compass", "setTimeout", [frequency + 10000]);
            }
        },
        function(e) { }, "Compass", "getTimeout", []);

    // Start watch timer to get headings
    var id = PhoneGap.createUUID();
    navigator.compass.timers[id] = setInterval(
        function() {
            PhoneGap.exec(successCallback, errorCallback, "Compass", "getHeading", []);
        }, (frequency ? frequency : 1));

    return id;
};


/**
 * Clears the specified heading watch.
 *
 * @param {String} id       The ID of the watch returned from #watchHeading.
 */
Compass.prototype.clearWatch = function(id) {

    // Stop javascript timer & remove from timer list
    if (id && navigator.compass.timers[id]) {
        clearInterval(navigator.compass.timers[id]);
        delete navigator.compass.timers[id];
    }
};

Compass.prototype._castDate = function(pluginResult) {
    if (pluginResult.message.timestamp) {
        var timestamp = new Date(pluginResult.message.timestamp);
        pluginResult.message.timestamp = timestamp;
    }
    return pluginResult;
};

PhoneGap.addConstructor(function() {
    if (typeof navigator.compass === "undefined") {
        navigator.compass = new Compass();
    }
});
}
/*
 *     Licensed to the Apache Software Foundation (ASF) under one
 *     or more contributor license agreements.  See the NOTICE file
 *     distributed with this work for additional information
 *     regarding copyright ownership.  The ASF licenses this file
 *     to you under the Apache License, Version 2.0 (the
 *     "License"); you may not use this file except in compliance
 *     with the License.  You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing,
 *     software distributed under the License is distributed on an
 *     "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *     KIND, either express or implied.  See the License for the
 *     specific language governing permissions and limitations
 *     under the License.
 */

if (!PhoneGap.hasResource("contact")) {
PhoneGap.addResource("contact");

/**
* Contains information about a single contact.
* @constructor
* @param {DOMString} id unique identifier
* @param {DOMString} displayName
* @param {ContactName} name
* @param {DOMString} nickname
* @param {Array.<ContactField>} phoneNumbers array of phone numbers
* @param {Array.<ContactField>} emails array of email addresses
* @param {Array.<ContactAddress>} addresses array of addresses
* @param {Array.<ContactField>} ims instant messaging user ids
* @param {Array.<ContactOrganization>} organizations
* @param {DOMString} birthday contact's birthday
* @param {DOMString} note user notes about contact
* @param {Array.<ContactField>} photos
* @param {Array.<ContactField>} categories
* @param {Array.<ContactField>} urls contact's web sites
*/
var Contact = function (id, displayName, name, nickname, phoneNumbers, emails, addresses,
    ims, organizations, birthday, note, photos, categories, urls) {
    this.id = id || null;
    this.rawId = null;
    this.displayName = displayName || null;
    this.name = name || null; // ContactName
    this.nickname = nickname || null;
    this.phoneNumbers = phoneNumbers || null; // ContactField[]
    this.emails = emails || null; // ContactField[]
    this.addresses = addresses || null; // ContactAddress[]
    this.ims = ims || null; // ContactField[]
    this.organizations = organizations || null; // ContactOrganization[]
    this.birthday = birthday || null;
    this.note = note || null;
    this.photos = photos || null; // ContactField[]
    this.categories = categories || null; // ContactField[]
    this.urls = urls || null; // ContactField[]
};

/**
 *  ContactError.
 *  An error code assigned by an implementation when an error has occurreds
 * @constructor
 */
var ContactError = function() {
    this.code=null;
};

/**
 * Error codes
 */
ContactError.UNKNOWN_ERROR = 0;
ContactError.INVALID_ARGUMENT_ERROR = 1;
ContactError.TIMEOUT_ERROR = 2;
ContactError.PENDING_OPERATION_ERROR = 3;
ContactError.IO_ERROR = 4;
ContactError.NOT_SUPPORTED_ERROR = 5;
ContactError.PERMISSION_DENIED_ERROR = 20;

/**
* Removes contact from device storage.
* @param successCB success callback
* @param errorCB error callback
*/
Contact.prototype.remove = function(successCB, errorCB) {
    if (this.id === null) {
        var errorObj = new ContactError();
        errorObj.code = ContactError.UNKNOWN_ERROR;
        errorCB(errorObj);
    }
    else {
        PhoneGap.exec(successCB, errorCB, "Contacts", "remove", [this.id]);
    }
};

/**
* Creates a deep copy of this Contact.
* With the contact ID set to null.
* @return copy of this Contact
*/
Contact.prototype.clone = function() {
    var clonedContact = PhoneGap.clone(this);
    var i;
    clonedContact.id = null;
    clonedContact.rawId = null;
    // Loop through and clear out any id's in phones, emails, etc.
    if (clonedContact.phoneNumbers) {
        for (i = 0; i < clonedContact.phoneNumbers.length; i++) {
            clonedContact.phoneNumbers[i].id = null;
        }
    }
    if (clonedContact.emails) {
        for (i = 0; i < clonedContact.emails.length; i++) {
            clonedContact.emails[i].id = null;
        }
    }
    if (clonedContact.addresses) {
        for (i = 0; i < clonedContact.addresses.length; i++) {
            clonedContact.addresses[i].id = null;
        }
    }
    if (clonedContact.ims) {
        for (i = 0; i < clonedContact.ims.length; i++) {
            clonedContact.ims[i].id = null;
        }
    }
    if (clonedContact.organizations) {
        for (i = 0; i < clonedContact.organizations.length; i++) {
            clonedContact.organizations[i].id = null;
        }
    }
    if (clonedContact.tags) {
        for (i = 0; i < clonedContact.tags.length; i++) {
            clonedContact.tags[i].id = null;
        }
    }
    if (clonedContact.photos) {
        for (i = 0; i < clonedContact.photos.length; i++) {
            clonedContact.photos[i].id = null;
        }
    }
    if (clonedContact.urls) {
        for (i = 0; i < clonedContact.urls.length; i++) {
            clonedContact.urls[i].id = null;
        }
    }
    return clonedContact;
};

/**
* Persists contact to device storage.
* @param successCB success callback
* @param errorCB error callback
*/
Contact.prototype.save = function(successCB, errorCB) {
    PhoneGap.exec(successCB, errorCB, "Contacts", "save", [this]);
};

/**
* Contact name.
* @constructor
* @param formatted
* @param familyName
* @param givenName
* @param middle
* @param prefix
* @param suffix
*/
var ContactName = function(formatted, familyName, givenName, middle, prefix, suffix) {
    this.formatted = formatted || null;
    this.familyName = familyName || null;
    this.givenName = givenName || null;
    this.middleName = middle || null;
    this.honorificPrefix = prefix || null;
    this.honorificSuffix = suffix || null;
};

/**
* Generic contact field.
* @constructor
* @param {DOMString} id unique identifier, should only be set by native code
* @param type
* @param value
* @param pref
*/
var ContactField = function(type, value, pref) {
	this.id = null;
    this.type = type || null;
    this.value = value || null;
    this.pref = pref || null;
};

/**
* Contact address.
* @constructor
* @param {DOMString} id unique identifier, should only be set by native code
* @param formatted
* @param streetAddress
* @param locality
* @param region
* @param postalCode
* @param country
*/
var ContactAddress = function(pref, type, formatted, streetAddress, locality, region, postalCode, country) {
	this.id = null;
    this.pref = pref || null;
    this.type = type || null;
    this.formatted = formatted || null;
    this.streetAddress = streetAddress || null;
    this.locality = locality || null;
    this.region = region || null;
    this.postalCode = postalCode || null;
    this.country = country || null;
};

/**
* Contact organization.
* @constructor
* @param {DOMString} id unique identifier, should only be set by native code
* @param name
* @param dept
* @param title
* @param startDate
* @param endDate
* @param location
* @param desc
*/
var ContactOrganization = function(pref, type, name, dept, title) {
	this.id = null;
    this.pref = pref || null;
    this.type = type || null;
    this.name = name || null;
    this.department = dept || null;
    this.title = title || null;
};

/**
* Represents a group of Contacts.
* @constructor
*/
var Contacts = function() {
    this.inProgress = false;
    this.records = [];
};
/**
* Returns an array of Contacts matching the search criteria.
* @param fields that should be searched
* @param successCB success callback
* @param errorCB error callback
* @param {ContactFindOptions} options that can be applied to contact searching
* @return array of Contacts matching search criteria
*/
Contacts.prototype.find = function(fields, successCB, errorCB, options) {
    if (successCB === null) {
        throw new TypeError("You must specify a success callback for the find command.");
    }
    if (fields === null || fields === "undefined" || fields.length === "undefined" || fields.length <= 0) {
        if (typeof errorCB === "function") {
            errorCB({"code": ContactError.INVALID_ARGUMENT_ERROR});
        }
    } else {
        PhoneGap.exec(successCB, errorCB, "Contacts", "search", [fields, options]);        
    }
};

/**
* This function creates a new contact, but it does not persist the contact
* to device storage. To persist the contact to device storage, invoke
* contact.save().
* @param properties an object who's properties will be examined to create a new Contact
* @returns new Contact object
*/
Contacts.prototype.create = function(properties) {
    var i;
	var contact = new Contact();
    for (i in properties) {
        if (contact[i] !== 'undefined') {
            contact[i] = properties[i];
        }
    }
    return contact;
};

/**
* This function returns and array of contacts.  It is required as we need to convert raw
* JSON objects into concrete Contact objects.  Currently this method is called after
* navigator.contacts.find but before the find methods success call back.
*
* @param jsonArray an array of JSON Objects that need to be converted to Contact objects.
* @returns an array of Contact objects
*/
Contacts.prototype.cast = function(pluginResult) {
	var contacts = [];
	var i;
	for (i=0; i<pluginResult.message.length; i++) {
		contacts.push(navigator.contacts.create(pluginResult.message[i]));
	}
	pluginResult.message = contacts;
	return pluginResult;
};

/**
 * ContactFindOptions.
 * @constructor
 * @param filter used to match contacts against
 * @param multiple boolean used to determine if more than one contact should be returned
 */
var ContactFindOptions = function(filter, multiple) {
    this.filter = filter || '';
    this.multiple = multiple || false;
};

/**
 * Add the contact interface into the browser.
 */
PhoneGap.addConstructor(function() {
    if(typeof navigator.contacts === "undefined") {
        navigator.contacts = new Contacts();
    }
});
}
/*
 *     Licensed to the Apache Software Foundation (ASF) under one
 *     or more contributor license agreements.  See the NOTICE file
 *     distributed with this work for additional information
 *     regarding copyright ownership.  The ASF licenses this file
 *     to you under the Apache License, Version 2.0 (the
 *     "License"); you may not use this file except in compliance
 *     with the License.  You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing,
 *     software distributed under the License is distributed on an
 *     "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *     KIND, either express or implied.  See the License for the
 *     specific language governing permissions and limitations
 *     under the License.
 */

// TODO: Needs to be commented

if (!PhoneGap.hasResource("crypto")) {
PhoneGap.addResource("crypto");

/**
* @constructor
*/
var Crypto = function() {
};

Crypto.prototype.encrypt = function(seed, string, callback) {
    this.encryptWin = callback;
    PhoneGap.exec(null, null, "Crypto", "encrypt", [seed, string]);
};

Crypto.prototype.decrypt = function(seed, string, callback) {
    this.decryptWin = callback;
    PhoneGap.exec(null, null, "Crypto", "decrypt", [seed, string]);
};

Crypto.prototype.gotCryptedString = function(string) {
    this.encryptWin(string);
};

Crypto.prototype.getPlainString = function(string) {
    this.decryptWin(string);
};

PhoneGap.addConstructor(function() {
    if (typeof navigator.Crypto === "undefined") {
        navigator.Crypto = new Crypto();
    }
});
}
/*
 *     Licensed to the Apache Software Foundation (ASF) under one
 *     or more contributor license agreements.  See the NOTICE file
 *     distributed with this work for additional information
 *     regarding copyright ownership.  The ASF licenses this file
 *     to you under the Apache License, Version 2.0 (the
 *     "License"); you may not use this file except in compliance
 *     with the License.  You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing,
 *     software distributed under the License is distributed on an
 *     "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *     KIND, either express or implied.  See the License for the
 *     specific language governing permissions and limitations
 *     under the License.
 */

if (!PhoneGap.hasResource("file")) {
PhoneGap.addResource("file");

/**
 * This class provides some useful information about a file.
 * @constructor
 */
var FileProperties = function(filePath) {
    this.filePath = filePath;
    this.size = 0;
    this.lastModifiedDate = null;
};

/**
 * Represents a single file.
 *
 * @constructor
 * @param name {DOMString} name of the file, without path information
 * @param fullPath {DOMString} the full path of the file, including the name
 * @param type {DOMString} mime type
 * @param lastModifiedDate {Date} last modified date
 * @param size {Number} size of the file in bytes
 */
var File = function(name, fullPath, type, lastModifiedDate, size) {
    this.name = name || null;
    this.fullPath = fullPath || null;
    this.type = type || null;
    this.lastModifiedDate = lastModifiedDate || null;
    this.size = size || 0;
};

/** @constructor */
var FileError = function() {
   this.code = null;
};

// File error codes
// Found in DOMException
FileError.NOT_FOUND_ERR = 1;
FileError.SECURITY_ERR = 2;
FileError.ABORT_ERR = 3;

// Added by this specification
FileError.NOT_READABLE_ERR = 4;
FileError.ENCODING_ERR = 5;
FileError.NO_MODIFICATION_ALLOWED_ERR = 6;
FileError.INVALID_STATE_ERR = 7;
FileError.SYNTAX_ERR = 8;
FileError.INVALID_MODIFICATION_ERR = 9;
FileError.QUOTA_EXCEEDED_ERR = 10;
FileError.TYPE_MISMATCH_ERR = 11;
FileError.PATH_EXISTS_ERR = 12;

//-----------------------------------------------------------------------------
// File Reader
//-----------------------------------------------------------------------------

/**
 * This class reads the mobile device file system.
 *
 * For Android:
 *      The root directory is the root of the file system.
 *      To read from the SD card, the file name is "sdcard/my_file.txt"
 * @constructor
 */
var FileReader = function() {
    this.fileName = "";

    this.readyState = 0;

    // File data
    this.result = null;

    // Error
    this.error = null;

    // Event handlers
    this.onloadstart = null;    // When the read starts.
    this.onprogress = null;     // While reading (and decoding) file or fileBlob data, and reporting partial file data (progess.loaded/progress.total)
    this.onload = null;         // When the read has successfully completed.
    this.onerror = null;        // When the read has failed (see errors).
    this.onloadend = null;      // When the request has completed (either in success or failure).
    this.onabort = null;        // When the read has been aborted. For instance, by invoking the abort() method.
};

// States
FileReader.EMPTY = 0;
FileReader.LOADING = 1;
FileReader.DONE = 2;

/**
 * Abort reading file.
 */
FileReader.prototype.abort = function() {
    var evt;
    this.readyState = FileReader.DONE;
    this.result = null;

    // set error
    var error = new FileError();
    error.code = error.ABORT_ERR;
    this.error = error;

    // If error callback
    if (typeof this.onerror === "function") {
        this.onerror({"type":"error", "target":this});
    }
    // If abort callback
    if (typeof this.onabort === "function") {
        this.onabort({"type":"abort", "target":this});
    }
    // If load end callback
    if (typeof this.onloadend === "function") {
        this.onloadend({"type":"loadend", "target":this});
    }
};

/**
 * Read text file.
 *
 * @param file          {File} File object containing file properties
 * @param encoding      [Optional] (see http://www.iana.org/assignments/character-sets)
 */
FileReader.prototype.readAsText = function(file, encoding) {
    this.fileName = "";
    if (typeof file.fullPath === "undefined") {
        this.fileName = file;
    } else {
        this.fileName = file.fullPath;
    }

    // LOADING state
    this.readyState = FileReader.LOADING;

    // If loadstart callback
    if (typeof this.onloadstart === "function") {
        this.onloadstart({"type":"loadstart", "target":this});
    }

    // Default encoding is UTF-8
    var enc = encoding ? encoding : "UTF-8";

    var me = this;

    // Read file
    PhoneGap.exec(
        // Success callback
        function(r) {
            var evt;

            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileReader.DONE) {
                return;
            }

            // Save result
            me.result = r;

            // If onload callback
            if (typeof me.onload === "function") {
                me.onload({"type":"load", "target":me});
            }

            // DONE state
            me.readyState = FileReader.DONE;

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend({"type":"loadend", "target":me});
            }
        },
        // Error callback
        function(e) {
            var evt;
            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileReader.DONE) {
                return;
            }

            // Save error
            me.error = e;

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror({"type":"error", "target":me});
            }

            // DONE state
            me.readyState = FileReader.DONE;

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend({"type":"loadend", "target":me});
            }
        }, "File", "readAsText", [this.fileName, enc]);
};


/**
 * Read file and return data as a base64 encoded data url.
 * A data url is of the form:
 *      data:[<mediatype>][;base64],<data>
 *
 * @param file          {File} File object containing file properties
 */
FileReader.prototype.readAsDataURL = function(file) {
    this.fileName = "";
    if (typeof file.fullPath === "undefined") {
        this.fileName = file;
    } else {
        this.fileName = file.fullPath;
    }

    // LOADING state
    this.readyState = FileReader.LOADING;

    // If loadstart callback
    if (typeof this.onloadstart === "function") {
        this.onloadstart({"type":"loadstart", "target":this});
    }

    var me = this;

    // Read file
    PhoneGap.exec(
        // Success callback
        function(r) {
            var evt;

            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileReader.DONE) {
                return;
            }

            // Save result
            me.result = r;

            // If onload callback
            if (typeof me.onload === "function") {
                me.onload({"type":"load", "target":me});
            }

            // DONE state
            me.readyState = FileReader.DONE;

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend({"type":"loadend", "target":me});
            }
        },
        // Error callback
        function(e) {
            var evt;
            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileReader.DONE) {
                return;
            }

            // Save error
            me.error = e;

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror({"type":"error", "target":me});
            }

            // DONE state
            me.readyState = FileReader.DONE;

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend({"type":"loadend", "target":me});
            }
        }, "File", "readAsDataURL", [this.fileName]);
};

/**
 * Read file and return data as a binary data.
 *
 * @param file          {File} File object containing file properties
 */
FileReader.prototype.readAsBinaryString = function(file) {
    // TODO - Can't return binary data to browser.
    this.fileName = file;
};

/**
 * Read file and return data as a binary data.
 *
 * @param file          {File} File object containing file properties
 */
FileReader.prototype.readAsArrayBuffer = function(file) {
    // TODO - Can't return binary data to browser.
    this.fileName = file;
};

//-----------------------------------------------------------------------------
// File Writer
//-----------------------------------------------------------------------------

/**
 * This class writes to the mobile device file system.
 *
 * For Android:
 *      The root directory is the root of the file system.
 *      To write to the SD card, the file name is "sdcard/my_file.txt"
 *
 * @constructor
 * @param file {File} File object containing file properties
 * @param append if true write to the end of the file, otherwise overwrite the file
 */
var FileWriter = function(file) {
    this.fileName = "";
    this.length = 0;
    if (file) {
        this.fileName = file.fullPath || file;
        this.length = file.size || 0;
    }
    // default is to write at the beginning of the file
    this.position = 0;

    this.readyState = 0; // EMPTY

    this.result = null;

    // Error
    this.error = null;

    // Event handlers
    this.onwritestart = null;   // When writing starts
    this.onprogress = null;     // While writing the file, and reporting partial file data
    this.onwrite = null;        // When the write has successfully completed.
    this.onwriteend = null;     // When the request has completed (either in success or failure).
    this.onabort = null;        // When the write has been aborted. For instance, by invoking the abort() method.
    this.onerror = null;        // When the write has failed (see errors).
};

// States
FileWriter.INIT = 0;
FileWriter.WRITING = 1;
FileWriter.DONE = 2;

/**
 * Abort writing file.
 */
FileWriter.prototype.abort = function() {
    // check for invalid state
    if (this.readyState === FileWriter.DONE || this.readyState === FileWriter.INIT) {
        throw FileError.INVALID_STATE_ERR;
    }

    // set error
    var error = new FileError(), evt;
    error.code = error.ABORT_ERR;
    this.error = error;

    // If error callback
    if (typeof this.onerror === "function") {
        this.onerror({"type":"error", "target":this});
    }
    // If abort callback
    if (typeof this.onabort === "function") {
        this.onabort({"type":"abort", "target":this});
    }

    this.readyState = FileWriter.DONE;

    // If write end callback
    if (typeof this.onwriteend === "function") {
        this.onwriteend({"type":"writeend", "target":this});
    }
};

/**
 * Writes data to the file
 *
 * @param text to be written
 */
FileWriter.prototype.write = function(text) {
    // Throw an exception if we are already writing a file
    if (this.readyState === FileWriter.WRITING) {
        throw FileError.INVALID_STATE_ERR;
    }

    // WRITING state
    this.readyState = FileWriter.WRITING;

    var me = this;

    // If onwritestart callback
    if (typeof me.onwritestart === "function") {
        me.onwritestart({"type":"writestart", "target":me});
    }

    // Write file
    PhoneGap.exec(
        // Success callback
        function(r) {
            var evt;
            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileWriter.DONE) {
                return;
            }

            // position always increases by bytes written because file would be extended
            me.position += r;
            // The length of the file is now where we are done writing.
            me.length = me.position;

            // If onwrite callback
            if (typeof me.onwrite === "function") {
                me.onwrite({"type":"write", "target":me});
            }

            // DONE state
            me.readyState = FileWriter.DONE;

            // If onwriteend callback
            if (typeof me.onwriteend === "function") {
                me.onwriteend({"type":"writeend", "target":me});
            }
        },
        // Error callback
        function(e) {
            var evt;

            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileWriter.DONE) {
                return;
            }

            // Save error
            me.error = e;

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror({"type":"error", "target":me});
            }

            // DONE state
            me.readyState = FileWriter.DONE;

            // If onwriteend callback
            if (typeof me.onwriteend === "function") {
                me.onwriteend({"type":"writeend", "target":me});
            }
        }, "File", "write", [this.fileName, text, this.position]);
};

/**
 * Moves the file pointer to the location specified.
 *
 * If the offset is a negative number the position of the file
 * pointer is rewound.  If the offset is greater than the file
 * size the position is set to the end of the file.
 *
 * @param offset is the location to move the file pointer to.
 */
FileWriter.prototype.seek = function(offset) {
    // Throw an exception if we are already writing a file
    if (this.readyState === FileWriter.WRITING) {
        throw FileError.INVALID_STATE_ERR;
    }

    if (!offset) {
        return;
    }

    // See back from end of file.
    if (offset < 0) {
        this.position = Math.max(offset + this.length, 0);
    }
    // Offset is bigger then file size so set position
    // to the end of the file.
    else if (offset > this.length) {
        this.position = this.length;
    }
    // Offset is between 0 and file size so set the position
    // to start writing.
    else {
        this.position = offset;
    }
};

/**
 * Truncates the file to the size specified.
 *
 * @param size to chop the file at.
 */
FileWriter.prototype.truncate = function(size) {
    // Throw an exception if we are already writing a file
    if (this.readyState === FileWriter.WRITING) {
        throw FileError.INVALID_STATE_ERR;
    }

    // WRITING state
    this.readyState = FileWriter.WRITING;

    var me = this;

    // If onwritestart callback
    if (typeof me.onwritestart === "function") {
        me.onwritestart({"type":"writestart", "target":this});
    }

    // Write file
    PhoneGap.exec(
        // Success callback
        function(r) {
            var evt;
            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileWriter.DONE) {
                return;
            }

            // Update the length of the file
            me.length = r;
            me.position = Math.min(me.position, r);

            // If onwrite callback
            if (typeof me.onwrite === "function") {
                me.onwrite({"type":"write", "target":me});
            }

            // DONE state
            me.readyState = FileWriter.DONE;

            // If onwriteend callback
            if (typeof me.onwriteend === "function") {
                me.onwriteend({"type":"writeend", "target":me});
            }
        },
        // Error callback
        function(e) {
            var evt;
            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileWriter.DONE) {
                return;
            }

            // Save error
            me.error = e;

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror({"type":"error", "target":me});
            }

            // DONE state
            me.readyState = FileWriter.DONE;

            // If onwriteend callback
            if (typeof me.onwriteend === "function") {
                me.onwriteend({"type":"writeend", "target":me});
            }
        }, "File", "truncate", [this.fileName, size]);
};

/**
 * Information about the state of the file or directory
 *
 * @constructor
 * {Date} modificationTime (readonly)
 */
var Metadata = function() {
    this.modificationTime=null;
};

/**
 * Supplies arguments to methods that lookup or create files and directories
 *
 * @constructor
 * @param {boolean} create file or directory if it doesn't exist
 * @param {boolean} exclusive if true the command will fail if the file or directory exists
 */
var Flags = function(create, exclusive) {
    this.create = create || false;
    this.exclusive = exclusive || false;
};

/**
 * An interface representing a file system
 *
 * @constructor
 * {DOMString} name the unique name of the file system (readonly)
 * {DirectoryEntry} root directory of the file system (readonly)
 */
var FileSystem = function() {
    this.name = null;
    this.root = null;
};

/**
 * An interface that lists the files and directories in a directory.
 * @constructor
 */
var DirectoryReader = function(fullPath){
    this.fullPath = fullPath || null;
};

/**
 * Returns a list of entries from a directory.
 *
 * @param {Function} successCallback is called with a list of entries
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryReader.prototype.readEntries = function(successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "readEntries", [this.fullPath]);
};

/**
 * An interface representing a directory on the file system.
 *
 * @constructor
 * {boolean} isFile always false (readonly)
 * {boolean} isDirectory always true (readonly)
 * {DOMString} name of the directory, excluding the path leading to it (readonly)
 * {DOMString} fullPath the absolute full path to the directory (readonly)
 * {FileSystem} filesystem on which the directory resides (readonly)
 */
var DirectoryEntry = function() {
    this.isFile = false;
    this.isDirectory = true;
    this.name = null;
    this.fullPath = null;
    this.filesystem = null;
};

/**
 * Copies a directory to a new location
 *
 * @param {DirectoryEntry} parent the directory to which to copy the entry
 * @param {DOMString} newName the new name of the entry, defaults to the current name
 * @param {Function} successCallback is called with the new entry
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryEntry.prototype.copyTo = function(parent, newName, successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "copyTo", [this.fullPath, parent, newName]);
};

/**
 * Looks up the metadata of the entry
 *
 * @param {Function} successCallback is called with a Metadata object
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryEntry.prototype.getMetadata = function(successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "getMetadata", [this.fullPath]);
};

/**
 * Gets the parent of the entry
 *
 * @param {Function} successCallback is called with a parent entry
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryEntry.prototype.getParent = function(successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "getParent", [this.fullPath]);
};

/**
 * Moves a directory to a new location
 *
 * @param {DirectoryEntry} parent the directory to which to move the entry
 * @param {DOMString} newName the new name of the entry, defaults to the current name
 * @param {Function} successCallback is called with the new entry
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryEntry.prototype.moveTo = function(parent, newName, successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "moveTo", [this.fullPath, parent, newName]);
};

/**
 * Removes the entry
 *
 * @param {Function} successCallback is called with no parameters
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryEntry.prototype.remove = function(successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "remove", [this.fullPath]);
};

/**
 * Returns a URI that can be used to identify this entry.
 *
 * @param {DOMString} mimeType for a FileEntry, the mime type to be used to interpret the file, when loaded through this URI.
 * @return uri
 */
DirectoryEntry.prototype.toURI = function(mimeType) {
    return "file://" + this.fullPath;
};

/**
 * Creates a new DirectoryReader to read entries from this directory
 */
DirectoryEntry.prototype.createReader = function(successCallback, errorCallback) {
    return new DirectoryReader(this.fullPath);
};

/**
 * Creates or looks up a directory
 *
 * @param {DOMString} path either a relative or absolute path from this directory in which to look up or create a directory
 * @param {Flags} options to create or excluively create the directory
 * @param {Function} successCallback is called with the new entry
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryEntry.prototype.getDirectory = function(path, options, successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "getDirectory", [this.fullPath, path, options]);
};

/**
 * Creates or looks up a file
 *
 * @param {DOMString} path either a relative or absolute path from this directory in which to look up or create a file
 * @param {Flags} options to create or excluively create the file
 * @param {Function} successCallback is called with the new entry
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryEntry.prototype.getFile = function(path, options, successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "getFile", [this.fullPath, path, options]);
};

/**
 * Deletes a directory and all of it's contents
 *
 * @param {Function} successCallback is called with no parameters
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryEntry.prototype.removeRecursively = function(successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "removeRecursively", [this.fullPath]);
};

/**
 * An interface representing a directory on the file system.
 *
 * @constructor
 * {boolean} isFile always true (readonly)
 * {boolean} isDirectory always false (readonly)
 * {DOMString} name of the file, excluding the path leading to it (readonly)
 * {DOMString} fullPath the absolute full path to the file (readonly)
 * {FileSystem} filesystem on which the directory resides (readonly)
 */
var FileEntry = function() {
    this.isFile = true;
    this.isDirectory = false;
    this.name = null;
    this.fullPath = null;
    this.filesystem = null;
};

/**
 * Copies a file to a new location
 *
 * @param {DirectoryEntry} parent the directory to which to copy the entry
 * @param {DOMString} newName the new name of the entry, defaults to the current name
 * @param {Function} successCallback is called with the new entry
 * @param {Function} errorCallback is called with a FileError
 */
FileEntry.prototype.copyTo = function(parent, newName, successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "copyTo", [this.fullPath, parent, newName]);
};

/**
 * Looks up the metadata of the entry
 *
 * @param {Function} successCallback is called with a Metadata object
 * @param {Function} errorCallback is called with a FileError
 */
FileEntry.prototype.getMetadata = function(successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "getMetadata", [this.fullPath]);
};

/**
 * Gets the parent of the entry
 *
 * @param {Function} successCallback is called with a parent entry
 * @param {Function} errorCallback is called with a FileError
 */
FileEntry.prototype.getParent = function(successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "getParent", [this.fullPath]);
};

/**
 * Moves a directory to a new location
 *
 * @param {DirectoryEntry} parent the directory to which to move the entry
 * @param {DOMString} newName the new name of the entry, defaults to the current name
 * @param {Function} successCallback is called with the new entry
 * @param {Function} errorCallback is called with a FileError
 */
FileEntry.prototype.moveTo = function(parent, newName, successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "moveTo", [this.fullPath, parent, newName]);
};

/**
 * Removes the entry
 *
 * @param {Function} successCallback is called with no parameters
 * @param {Function} errorCallback is called with a FileError
 */
FileEntry.prototype.remove = function(successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "remove", [this.fullPath]);
};

/**
 * Returns a URI that can be used to identify this entry.
 *
 * @param {DOMString} mimeType for a FileEntry, the mime type to be used to interpret the file, when loaded through this URI.
 * @return uri
 */
FileEntry.prototype.toURI = function(mimeType) {
    return "file://" + this.fullPath;
};

/**
 * Creates a new FileWriter associated with the file that this FileEntry represents.
 *
 * @param {Function} successCallback is called with the new FileWriter
 * @param {Function} errorCallback is called with a FileError
 */
FileEntry.prototype.createWriter = function(successCallback, errorCallback) {
    this.file(function(filePointer) {
        var writer = new FileWriter(filePointer);
    
        if (writer.fileName === null || writer.fileName === "") {
            if (typeof errorCallback === "function") {
                errorCallback({
                    "code": FileError.INVALID_STATE_ERR
                });
            }
        }
    
        if (typeof successCallback === "function") {
            successCallback(writer);
        }       
    }, errorCallback);
};

/**
 * Returns a File that represents the current state of the file that this FileEntry represents.
 *
 * @param {Function} successCallback is called with the new File object
 * @param {Function} errorCallback is called with a FileError
 */
FileEntry.prototype.file = function(successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "getFileMetadata", [this.fullPath]);
};

/** @constructor */
var LocalFileSystem = function() {
};

// File error codes
LocalFileSystem.TEMPORARY = 0;
LocalFileSystem.PERSISTENT = 1;
LocalFileSystem.RESOURCE = 2;
LocalFileSystem.APPLICATION = 3;

/**
 * Requests a filesystem in which to store application data.
 *
 * @param {int} type of file system being requested
 * @param {Function} successCallback is called with the new FileSystem
 * @param {Function} errorCallback is called with a FileError
 */
LocalFileSystem.prototype.requestFileSystem = function(type, size, successCallback, errorCallback) {
    if (type < 0 || type > 3) {
        if (typeof errorCallback === "function") {
            errorCallback({
                "code": FileError.SYNTAX_ERR
            });
        }
    }
    else {
        PhoneGap.exec(successCallback, errorCallback, "File", "requestFileSystem", [type, size]);
    }
};

/**
 *
 * @param {DOMString} uri referring to a local file in a filesystem
 * @param {Function} successCallback is called with the new entry
 * @param {Function} errorCallback is called with a FileError
 */
LocalFileSystem.prototype.resolveLocalFileSystemURI = function(uri, successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "resolveLocalFileSystemURI", [uri]);
};

/**
* This function returns and array of contacts.  It is required as we need to convert raw
* JSON objects into concrete Contact objects.  Currently this method is called after
* navigator.service.contacts.find but before the find methods success call back.
*
* @param a JSON Objects that need to be converted to DirectoryEntry or FileEntry objects.
* @returns an entry
*/
LocalFileSystem.prototype._castFS = function(pluginResult) {
    var entry = null;
    entry = new DirectoryEntry();
    entry.isDirectory = pluginResult.message.root.isDirectory;
    entry.isFile = pluginResult.message.root.isFile;
    entry.name = pluginResult.message.root.name;
    entry.fullPath = pluginResult.message.root.fullPath;
    pluginResult.message.root = entry;
    return pluginResult;
};

LocalFileSystem.prototype._castEntry = function(pluginResult) {
    var entry = null;
    if (pluginResult.message.isDirectory) {
        console.log("This is a dir");
        entry = new DirectoryEntry();
    }
    else if (pluginResult.message.isFile) {
        console.log("This is a file");
        entry = new FileEntry();
    }
    entry.isDirectory = pluginResult.message.isDirectory;
    entry.isFile = pluginResult.message.isFile;
    entry.name = pluginResult.message.name;
    entry.fullPath = pluginResult.message.fullPath;
    pluginResult.message = entry;
    return pluginResult;
};

LocalFileSystem.prototype._castEntries = function(pluginResult) {
    var entries = pluginResult.message;
    var retVal = [];
    for (var i=0; i<entries.length; i++) {
        retVal.push(window.localFileSystem._createEntry(entries[i]));
    }
    pluginResult.message = retVal;
    return pluginResult;
};

LocalFileSystem.prototype._createEntry = function(castMe) {
    var entry = null;
    if (castMe.isDirectory) {
        console.log("This is a dir");
        entry = new DirectoryEntry();
    }
    else if (castMe.isFile) {
        console.log("This is a file");
        entry = new FileEntry();
    }
    entry.isDirectory = castMe.isDirectory;
    entry.isFile = castMe.isFile;
    entry.name = castMe.name;
    entry.fullPath = castMe.fullPath;
    return entry;
};

LocalFileSystem.prototype._castDate = function(pluginResult) {
    if (pluginResult.message.modificationTime) {
        var modTime = new Date(pluginResult.message.modificationTime);
        pluginResult.message.modificationTime = modTime;
    }
    else if (pluginResult.message.lastModifiedDate) {
        var file = new File();
        file.size = pluginResult.message.size;
        file.type = pluginResult.message.type;
        file.name = pluginResult.message.name;
        file.fullPath = pluginResult.message.fullPath;
        file.lastModifiedDate = new Date(pluginResult.message.lastModifiedDate);
        pluginResult.message = file;
    }
    return pluginResult;
};

/**
 * Add the FileSystem interface into the browser.
 */
PhoneGap.addConstructor(function() {
    var pgLocalFileSystem = new LocalFileSystem();
    // Needed for cast methods
    if (typeof window.localFileSystem === "undefined") {
        window.localFileSystem = pgLocalFileSystem;
    }
    if (typeof window.requestFileSystem === "undefined") {
        window.requestFileSystem = pgLocalFileSystem.requestFileSystem;
    }
    if (typeof window.resolveLocalFileSystemURI === "undefined") {
        window.resolveLocalFileSystemURI = pgLocalFileSystem.resolveLocalFileSystemURI;
    }
});
}/*
 *     Licensed to the Apache Software Foundation (ASF) under one
 *     or more contributor license agreements.  See the NOTICE file
 *     distributed with this work for additional information
 *     regarding copyright ownership.  The ASF licenses this file
 *     to you under the Apache License, Version 2.0 (the
 *     "License"); you may not use this file except in compliance
 *     with the License.  You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing,
 *     software distributed under the License is distributed on an
 *     "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *     KIND, either express or implied.  See the License for the
 *     specific language governing permissions and limitations
 *     under the License.
 */

if (!PhoneGap.hasResource("filetransfer")) {
PhoneGap.addResource("filetransfer");

/**
 * FileTransfer uploads a file to a remote server.
 * @constructor
 */
var FileTransfer = function() {};

/**
 * FileUploadResult
 * @constructor
 */
var FileUploadResult = function() {
    this.bytesSent = 0;
    this.responseCode = null;
    this.response = null;
};

/**
 * FileTransferError
 * @constructor
 */
var FileTransferError = function() {
    this.code = null;
};

FileTransferError.FILE_NOT_FOUND_ERR = 1;
FileTransferError.INVALID_URL_ERR = 2;
FileTransferError.CONNECTION_ERR = 3;

/**
* Given an absolute file path, uploads a file on the device to a remote server
* using a multipart HTTP request.
* @param filePath {String}           Full path of the file on the device
* @param server {String}             URL of the server to receive the file
* @param successCallback (Function}  Callback to be invoked when upload has completed
* @param errorCallback {Function}    Callback to be invoked upon error
* @param options {FileUploadOptions} Optional parameters such as file name and mimetype
*/
FileTransfer.prototype.upload = function(filePath, server, successCallback, errorCallback, options, debug) {

    // check for options
    var fileKey = null;
    var fileName = null;
    var mimeType = null;
    var params = null;
    var chunkedMode = true;
    if (options) {
        fileKey = options.fileKey;
        fileName = options.fileName;
        mimeType = options.mimeType;
        if (options.chunkedMode !== null || typeof options.chunkedMode !== "undefined") {
            chunkedMode = options.chunkedMode;
        }
        if (options.params) {
            params = options.params;
        }
        else {
            params = {};
        }
    }

    PhoneGap.exec(successCallback, errorCallback, 'FileTransfer', 'upload', [filePath, server, fileKey, fileName, mimeType, params, debug, chunkedMode]);
};

/**
 * Downloads a file form a given URL and saves it to the specified directory.
 * @param source {String}          URL of the server to receive the file
 * @param target {String}         Full path of the file on the device
 * @param successCallback (Function}  Callback to be invoked when upload has completed
 * @param errorCallback {Function}    Callback to be invoked upon error
 */
FileTransfer.prototype.download = function(source, target, successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, 'FileTransfer', 'download', [source, target]);
};

/**
 * Options to customize the HTTP request used to upload files.
 * @constructor
 * @param fileKey {String}   Name of file request parameter.
 * @param fileName {String}  Filename to be used by the server. Defaults to image.jpg.
 * @param mimeType {String}  Mimetype of the uploaded file. Defaults to image/jpeg.
 * @param params {Object}    Object with key: value params to send to the server.
 */
var FileUploadOptions = function(fileKey, fileName, mimeType, params) {
    this.fileKey = fileKey || null;
    this.fileName = fileName || null;
    this.mimeType = mimeType || null;
    this.params = params || null;
};
}
/*
 *     Licensed to the Apache Software Foundation (ASF) under one
 *     or more contributor license agreements.  See the NOTICE file
 *     distributed with this work for additional information
 *     regarding copyright ownership.  The ASF licenses this file
 *     to you under the Apache License, Version 2.0 (the
 *     "License"); you may not use this file except in compliance
 *     with the License.  You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing,
 *     software distributed under the License is distributed on an
 *     "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *     KIND, either express or implied.  See the License for the
 *     specific language governing permissions and limitations
 *     under the License.
 */

if (!PhoneGap.hasResource("geolocation")) {
PhoneGap.addResource("geolocation");

/**
 * This class provides access to device GPS data.
 * @constructor
 */
var Geolocation = function() {

    // The last known GPS position.
    this.lastPosition = null;

    // Geolocation listeners
    this.listeners = {};
};

/**
 * Position error object
 *
 * @constructor
 * @param code
 * @param message
 */
var PositionError = function(code, message) {
    this.code = code;
    this.message = message;
};

PositionError.PERMISSION_DENIED = 1;
PositionError.POSITION_UNAVAILABLE = 2;
PositionError.TIMEOUT = 3;

/**
 * Asynchronously aquires the current position.
 *
 * @param {Function} successCallback    The function to call when the position data is available
 * @param {Function} errorCallback      The function to call when there is an error getting the heading position. (OPTIONAL)
 * @param {PositionOptions} options     The options for getting the position data. (OPTIONAL)
 */
Geolocation.prototype.getCurrentPosition = function(successCallback, errorCallback, options) {
    if (navigator._geo.listeners.global) {
        console.log("Geolocation Error: Still waiting for previous getCurrentPosition() request.");
        try {
            errorCallback(new PositionError(PositionError.TIMEOUT, "Geolocation Error: Still waiting for previous getCurrentPosition() request."));
        } catch (e) {
        }
        return;
    }
    var maximumAge = 10000;
    var enableHighAccuracy = false;
    var timeout = 10000;
    if (typeof options !== "undefined") {
        if (typeof options.maximumAge !== "undefined") {
            maximumAge = options.maximumAge;
        }
        if (typeof options.enableHighAccuracy !== "undefined") {
            enableHighAccuracy = options.enableHighAccuracy;
        }
        if (typeof options.timeout !== "undefined") {
            timeout = options.timeout;
        }
    }
    navigator._geo.listeners.global = {"success" : successCallback, "fail" : errorCallback };
    PhoneGap.exec(null, null, "Geolocation", "getCurrentLocation", [enableHighAccuracy, timeout, maximumAge]);
};

/**
 * Asynchronously watches the geolocation for changes to geolocation.  When a change occurs,
 * the successCallback is called with the new location.
 *
 * @param {Function} successCallback    The function to call each time the location data is available
 * @param {Function} errorCallback      The function to call when there is an error getting the location data. (OPTIONAL)
 * @param {PositionOptions} options     The options for getting the location data such as frequency. (OPTIONAL)
 * @return String                       The watch id that must be passed to #clearWatch to stop watching.
 */
Geolocation.prototype.watchPosition = function(successCallback, errorCallback, options) {
    var maximumAge = 10000;
    var enableHighAccuracy = false;
    var timeout = 10000;
    if (typeof options !== "undefined") {
        if (typeof options.frequency  !== "undefined") {
            maximumAge = options.frequency;
        }
        if (typeof options.maximumAge !== "undefined") {
            maximumAge = options.maximumAge;
        }
        if (typeof options.enableHighAccuracy !== "undefined") {
            enableHighAccuracy = options.enableHighAccuracy;
        }
        if (typeof options.timeout !== "undefined") {
            timeout = options.timeout;
        }
    }
    var id = PhoneGap.createUUID();
    navigator._geo.listeners[id] = {"success" : successCallback, "fail" : errorCallback };
    PhoneGap.exec(null, null, "Geolocation", "start", [id, enableHighAccuracy, timeout, maximumAge]);
    return id;
};

/*
 * Native callback when watch position has a new position.
 * PRIVATE METHOD
 *
 * @param {String} id
 * @param {Number} lat
 * @param {Number} lng
 * @param {Number} alt
 * @param {Number} altacc
 * @param {Number} head
 * @param {Number} vel
 * @param {Number} stamp
 */
Geolocation.prototype.success = function(id, lat, lng, alt, altacc, head, vel, stamp) {
    var coords = new Coordinates(lat, lng, alt, altacc, head, vel);
    var loc = new Position(coords, stamp);
    try {
        if (lat === "undefined" || lng === "undefined") {
            navigator._geo.listeners[id].fail(new PositionError(PositionError.POSITION_UNAVAILABLE, "Lat/Lng are undefined."));
        }
        else {
            navigator._geo.lastPosition = loc;
            navigator._geo.listeners[id].success(loc);
        }
    }
    catch (e) {
        console.log("Geolocation Error: Error calling success callback function.");
    }

    if (id === "global") {
        delete navigator._geo.listeners.global;
    }
};

/**
 * Native callback when watch position has an error.
 * PRIVATE METHOD
 *
 * @param {String} id       The ID of the watch
 * @param {Number} code     The error code
 * @param {String} msg      The error message
 */
Geolocation.prototype.fail = function(id, code, msg) {
    try {
        navigator._geo.listeners[id].fail(new PositionError(code, msg));
    }
    catch (e) {
        console.log("Geolocation Error: Error calling error callback function.");
    }
};

/**
 * Clears the specified heading watch.
 *
 * @param {String} id       The ID of the watch returned from #watchPosition
 */
Geolocation.prototype.clearWatch = function(id) {
    PhoneGap.exec(null, null, "Geolocation", "stop", [id]);
    delete navigator._geo.listeners[id];
};

/**
 * Force the PhoneGap geolocation to be used instead of built-in.
 */
Geolocation.usingPhoneGap = false;
Geolocation.usePhoneGap = function() {
    if (Geolocation.usingPhoneGap) {
        return;
    }
    Geolocation.usingPhoneGap = true;

    // Set built-in geolocation methods to our own implementations
    // (Cannot replace entire geolocation, but can replace individual methods)
    navigator.geolocation.setLocation = navigator._geo.setLocation;
    navigator.geolocation.getCurrentPosition = navigator._geo.getCurrentPosition;
    navigator.geolocation.watchPosition = navigator._geo.watchPosition;
    navigator.geolocation.clearWatch = navigator._geo.clearWatch;
    navigator.geolocation.start = navigator._geo.start;
    navigator.geolocation.stop = navigator._geo.stop;
};

PhoneGap.addConstructor(function() {
    navigator._geo = new Geolocation();

    // No native geolocation object for Android 1.x, so use PhoneGap geolocation
    if (typeof navigator.geolocation === 'undefined') {
        navigator.geolocation = navigator._geo;
        Geolocation.usingPhoneGap = true;
    }
});
}
/*
 *     Licensed to the Apache Software Foundation (ASF) under one
 *     or more contributor license agreements.  See the NOTICE file
 *     distributed with this work for additional information
 *     regarding copyright ownership.  The ASF licenses this file
 *     to you under the Apache License, Version 2.0 (the
 *     "License"); you may not use this file except in compliance
 *     with the License.  You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing,
 *     software distributed under the License is distributed on an
 *     "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *     KIND, either express or implied.  See the License for the
 *     specific language governing permissions and limitations
 *     under the License.
 */

if (!PhoneGap.hasResource("media")) {
PhoneGap.addResource("media");

/**
 * This class provides access to the device media, interfaces to both sound and video
 *
 * @constructor
 * @param src                   The file name or url to play
 * @param successCallback       The callback to be called when the file is done playing or recording.
 *                                  successCallback() - OPTIONAL
 * @param errorCallback         The callback to be called if there is an error.
 *                                  errorCallback(int errorCode) - OPTIONAL
 * @param statusCallback        The callback to be called when media status has changed.
 *                                  statusCallback(int statusCode) - OPTIONAL
 * @param positionCallback      The callback to be called when media position has changed.
 *                                  positionCallback(long position) - OPTIONAL
 */
var Media = function(src, successCallback, errorCallback, statusCallback, positionCallback) {

    // successCallback optional
    if (successCallback && (typeof successCallback !== "function")) {
        console.log("Media Error: successCallback is not a function");
        return;
    }

    // errorCallback optional
    if (errorCallback && (typeof errorCallback !== "function")) {
        console.log("Media Error: errorCallback is not a function");
        return;
    }

    // statusCallback optional
    if (statusCallback && (typeof statusCallback !== "function")) {
        console.log("Media Error: statusCallback is not a function");
        return;
    }

    // statusCallback optional
    if (positionCallback && (typeof positionCallback !== "function")) {
        console.log("Media Error: positionCallback is not a function");
        return;
    }

    this.id = PhoneGap.createUUID();
    PhoneGap.mediaObjects[this.id] = this;
    this.src = src;
    this.successCallback = successCallback;
    this.errorCallback = errorCallback;
    this.statusCallback = statusCallback;
    this.positionCallback = positionCallback;
    this._duration = -1;
    this._position = -1;
};

// Media messages
Media.MEDIA_STATE = 1;
Media.MEDIA_DURATION = 2;
Media.MEDIA_POSITION = 3;
Media.MEDIA_ERROR = 9;

// Media states
Media.MEDIA_NONE = 0;
Media.MEDIA_STARTING = 1;
Media.MEDIA_RUNNING = 2;
Media.MEDIA_PAUSED = 3;
Media.MEDIA_STOPPED = 4;
Media.MEDIA_MSG = ["None", "Starting", "Running", "Paused", "Stopped"];

// TODO: Will MediaError be used?
/**
 * This class contains information about any Media errors.
 * @constructor
 */
var MediaError = function() {
    this.code = null;
    this.message = "";
};

MediaError.MEDIA_ERR_NONE_ACTIVE    = 0;
MediaError.MEDIA_ERR_ABORTED        = 1;
MediaError.MEDIA_ERR_NETWORK        = 2;
MediaError.MEDIA_ERR_DECODE         = 3;
MediaError.MEDIA_ERR_NONE_SUPPORTED = 4;

/**
 * Start or resume playing audio file.
 */
Media.prototype.play = function() {
    PhoneGap.exec(null, null, "Media", "startPlayingAudio", [this.id, this.src]);
};

/**
 * Stop playing audio file.
 */
Media.prototype.stop = function() {
    return PhoneGap.exec(null, null, "Media", "stopPlayingAudio", [this.id]);
};

/**
 * Seek or jump to a new time in the track..
 */
Media.prototype.seekTo = function(milliseconds) {
    PhoneGap.exec(null, null, "Media", "seekToAudio", [this.id, milliseconds]);
};

/**
 * Pause playing audio file.
 */
Media.prototype.pause = function() {
    PhoneGap.exec(null, null, "Media", "pausePlayingAudio", [this.id]);
};

/**
 * Get duration of an audio file.
 * The duration is only set for audio that is playing, paused or stopped.
 *
 * @return      duration or -1 if not known.
 */
Media.prototype.getDuration = function() {
    return this._duration;
};

/**
 * Get position of audio.
 */
Media.prototype.getCurrentPosition = function(success, fail) {
    PhoneGap.exec(success, fail, "Media", "getCurrentPositionAudio", [this.id]);
};

/**
 * Start recording audio file.
 */
Media.prototype.startRecord = function() {
    PhoneGap.exec(null, null, "Media", "startRecordingAudio", [this.id, this.src]);
};

/**
 * Stop recording audio file.
 */
Media.prototype.stopRecord = function() {
    PhoneGap.exec(null, null, "Media", "stopRecordingAudio", [this.id]);
};

/**
 * Release the resources.
 */
Media.prototype.release = function() {
    PhoneGap.exec(null, null, "Media", "release", [this.id]);
};

/**
 * Adjust the volume.
 */
Media.prototype.setVolume = function(volume) {
    PhoneGap.exec(null, null, "Media", "setVolume", [this.id, volume]);
};

/**
 * List of media objects.
 * PRIVATE
 */
PhoneGap.mediaObjects = {};

/**
 * Object that receives native callbacks.
 * PRIVATE
 * @constructor
 */
PhoneGap.Media = function() {};

/**
 * Get the media object.
 * PRIVATE
 *
 * @param id            The media object id (string)
 */
PhoneGap.Media.getMediaObject = function(id) {
    return PhoneGap.mediaObjects[id];
};

/**
 * Audio has status update.
 * PRIVATE
 *
 * @param id            The media object id (string)
 * @param status        The status code (int)
 * @param msg           The status message (string)
 */
PhoneGap.Media.onStatus = function(id, msg, value) {
    var media = PhoneGap.mediaObjects[id];
    // If state update
    if (msg === Media.MEDIA_STATE) {
        if (value === Media.MEDIA_STOPPED) {
            if (media.successCallback) {
                media.successCallback();
            }
        }
        if (media.statusCallback) {
            media.statusCallback(value);
        }
    }
    else if (msg === Media.MEDIA_DURATION) {
        media._duration = value;
    }
    else if (msg === Media.MEDIA_ERROR) {
        if (media.errorCallback) {
            media.errorCallback({"code":value});
        }
    }
    else if (msg === Media.MEDIA_POSITION) {
        media._position = value;
    }
};
}
/*
 *     Licensed to the Apache Software Foundation (ASF) under one
 *     or more contributor license agreements.  See the NOTICE file
 *     distributed with this work for additional information
 *     regarding copyright ownership.  The ASF licenses this file
 *     to you under the Apache License, Version 2.0 (the
 *     "License"); you may not use this file except in compliance
 *     with the License.  You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing,
 *     software distributed under the License is distributed on an
 *     "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *     KIND, either express or implied.  See the License for the
 *     specific language governing permissions and limitations
 *     under the License.
 */


if (!PhoneGap.hasResource("network")) {
PhoneGap.addResource("network");

/**
 * This class contains information about the current network Connection.
 * @constructor
 */
var Connection = function() {
    this.type = null;
    this._firstRun = true;
    this._timer = null;
    this.timeout = 500;

    var me = this;
    this.getInfo(
        function(type) {
            // Need to send events if we are on or offline
            if (type === "none") {
                // set a timer if still offline at the end of timer send the offline event
                me._timer = setTimeout(function(){
                    me.type = type;
                    PhoneGap.fireDocumentEvent('offline');
                    me._timer = null;
                    }, me.timeout);
            } else {
                // If there is a current offline event pending clear it
                if (me._timer !== null) {
                    clearTimeout(me._timer);
                    me._timer = null;
                }
                me.type = type;
                PhoneGap.fireDocumentEvent('online');
            }
            
            // should only fire this once
            if (me._firstRun) {
                me._firstRun = false;
                PhoneGap.onPhoneGapConnectionReady.fire();
            }            
        },
        function(e) {
            // If we can't get the network info we should still tell PhoneGap
            // to fire the deviceready event.
            if (me._firstRun) {
                me._firstRun = false;
                PhoneGap.onPhoneGapConnectionReady.fire();
            }            
            console.log("Error initializing Network Connection: " + e);
        });
};

Connection.UNKNOWN = "unknown";
Connection.ETHERNET = "ethernet";
Connection.WIFI = "wifi";
Connection.CELL_2G = "2g";
Connection.CELL_3G = "3g";
Connection.CELL_4G = "4g";
Connection.NONE = "none";

/**
 * Get connection info
 *
 * @param {Function} successCallback The function to call when the Connection data is available
 * @param {Function} errorCallback The function to call when there is an error getting the Connection data. (OPTIONAL)
 */
Connection.prototype.getInfo = function(successCallback, errorCallback) {
    // Get info
    PhoneGap.exec(successCallback, errorCallback, "Network Status", "getConnectionInfo", []);
};


PhoneGap.addConstructor(function() {
    if (typeof navigator.network === "undefined") {
        navigator.network = {};
    }
    if (typeof navigator.network.connection === "undefined") {
        navigator.network.connection = new Connection();
    }
});
}
/*
 *     Licensed to the Apache Software Foundation (ASF) under one
 *     or more contributor license agreements.  See the NOTICE file
 *     distributed with this work for additional information
 *     regarding copyright ownership.  The ASF licenses this file
 *     to you under the Apache License, Version 2.0 (the
 *     "License"); you may not use this file except in compliance
 *     with the License.  You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing,
 *     software distributed under the License is distributed on an
 *     "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *     KIND, either express or implied.  See the License for the
 *     specific language governing permissions and limitations
 *     under the License.
 */

if (!PhoneGap.hasResource("notification")) {
PhoneGap.addResource("notification");

/**
 * This class provides access to notifications on the device.
 * @constructor
 */
var Notification = function() {
};

/**
 * Open a native alert dialog, with a customizable title and button text.
 *
 * @param {String} message              Message to print in the body of the alert
 * @param {Function} completeCallback   The callback that is called when user clicks on a button.
 * @param {String} title                Title of the alert dialog (default: Alert)
 * @param {String} buttonLabel          Label of the close button (default: OK)
 */
Notification.prototype.alert = function(message, completeCallback, title, buttonLabel) {
    var _title = (title || "Alert");
    var _buttonLabel = (buttonLabel || "OK");
    PhoneGap.exec(completeCallback, null, "Notification", "alert", [message,_title,_buttonLabel]);
};

/**
 * Open a native confirm dialog, with a customizable title and button text.
 * The result that the user selects is returned to the result callback.
 *
 * @param {String} message              Message to print in the body of the alert
 * @param {Function} resultCallback     The callback that is called when user clicks on a button.
 * @param {String} title                Title of the alert dialog (default: Confirm)
 * @param {String} buttonLabels         Comma separated list of the labels of the buttons (default: 'OK,Cancel')
 */
Notification.prototype.confirm = function(message, resultCallback, title, buttonLabels) {
    var _title = (title || "Confirm");
    var _buttonLabels = (buttonLabels || "OK,Cancel");
    PhoneGap.exec(resultCallback, null, "Notification", "confirm", [message,_title,_buttonLabels]);
};

/**
 * Start spinning the activity indicator on the statusbar
 */
Notification.prototype.activityStart = function() {
    PhoneGap.exec(null, null, "Notification", "activityStart", ["Busy","Please wait..."]);
};

/**
 * Stop spinning the activity indicator on the statusbar, if it's currently spinning
 */
Notification.prototype.activityStop = function() {
    PhoneGap.exec(null, null, "Notification", "activityStop", []);
};

/**
 * Display a progress dialog with progress bar that goes from 0 to 100.
 *
 * @param {String} title        Title of the progress dialog.
 * @param {String} message      Message to display in the dialog.
 */
Notification.prototype.progressStart = function(title, message) {
    PhoneGap.exec(null, null, "Notification", "progressStart", [title, message]);
};

/**
 * Set the progress dialog value.
 *
 * @param {Number} value         0-100
 */
Notification.prototype.progressValue = function(value) {
    PhoneGap.exec(null, null, "Notification", "progressValue", [value]);
};

/**
 * Close the progress dialog.
 */
Notification.prototype.progressStop = function() {
    PhoneGap.exec(null, null, "Notification", "progressStop", []);
};

/**
 * Causes the device to blink a status LED.
 *
 * @param {Integer} count       The number of blinks.
 * @param {String} colour       The colour of the light.
 */
Notification.prototype.blink = function(count, colour) {
    // NOT IMPLEMENTED
};

/**
 * Causes the device to vibrate.
 *
 * @param {Integer} mills       The number of milliseconds to vibrate for.
 */
Notification.prototype.vibrate = function(mills) {
    PhoneGap.exec(null, null, "Notification", "vibrate", [mills]);
};

/**
 * Causes the device to beep.
 * On Android, the default notification ringtone is played "count" times.
 *
 * @param {Integer} count       The number of beeps.
 */
Notification.prototype.beep = function(count) {
    PhoneGap.exec(null, null, "Notification", "beep", [count]);
};

PhoneGap.addConstructor(function() {
    if (typeof navigator.notification === "undefined") {
        navigator.notification = new Notification();
    }
});
}
/*
 *     Licensed to the Apache Software Foundation (ASF) under one
 *     or more contributor license agreements.  See the NOTICE file
 *     distributed with this work for additional information
 *     regarding copyright ownership.  The ASF licenses this file
 *     to you under the Apache License, Version 2.0 (the
 *     "License"); you may not use this file except in compliance
 *     with the License.  You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing,
 *     software distributed under the License is distributed on an
 *     "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *     KIND, either express or implied.  See the License for the
 *     specific language governing permissions and limitations
 *     under the License.
 */

if (!PhoneGap.hasResource("position")) {
PhoneGap.addResource("position");

/**
 * This class contains position information.
 * @param {Object} lat
 * @param {Object} lng
 * @param {Object} acc
 * @param {Object} alt
 * @param {Object} altacc
 * @param {Object} head
 * @param {Object} vel
 * @constructor
 */
var Position = function(coords, timestamp) {
	this.coords = coords;
	this.timestamp = (timestamp !== 'undefined') ? timestamp : new Date().getTime();
};

/** @constructor */
var Coordinates = function(lat, lng, alt, acc, head, vel, altacc) {
	/**
	 * The latitude of the position.
	 */
	this.latitude = lat;
	/**
	 * The longitude of the position,
	 */
	this.longitude = lng;
	/**
	 * The accuracy of the position.
	 */
	this.accuracy = acc;
	/**
	 * The altitude of the position.
	 */
	this.altitude = alt;
	/**
	 * The direction the device is moving at the position.
	 */
	this.heading = head;
	/**
	 * The velocity with which the device is moving at the position.
	 */
	this.speed = vel;
	/**
	 * The altitude accuracy of the position.
	 */
	this.altitudeAccuracy = (altacc !== 'undefined') ? altacc : null;
};

/**
 * This class specifies the options for requesting position data.
 * @constructor
 */
var PositionOptions = function() {
	/**
	 * Specifies the desired position accuracy.
	 */
	this.enableHighAccuracy = true;
	/**
	 * The timeout after which if position data cannot be obtained the errorCallback
	 * is called.
	 */
	this.timeout = 10000;
};

/**
 * This class contains information about any GSP errors.
 * @constructor
 */
var PositionError = function() {
	this.code = null;
	this.message = "";
};

PositionError.UNKNOWN_ERROR = 0;
PositionError.PERMISSION_DENIED = 1;
PositionError.POSITION_UNAVAILABLE = 2;
PositionError.TIMEOUT = 3;
}
/*
 *     Licensed to the Apache Software Foundation (ASF) under one
 *     or more contributor license agreements.  See the NOTICE file
 *     distributed with this work for additional information
 *     regarding copyright ownership.  The ASF licenses this file
 *     to you under the Apache License, Version 2.0 (the
 *     "License"); you may not use this file except in compliance
 *     with the License.  You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing,
 *     software distributed under the License is distributed on an
 *     "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *     KIND, either express or implied.  See the License for the
 *     specific language governing permissions and limitations
 *     under the License.
 */

/*
 * This is purely for the Android 1.5/1.6 HTML 5 Storage
 * I was hoping that Android 2.0 would deprecate this, but given the fact that
 * most manufacturers ship with Android 1.5 and do not do OTA Updates, this is required
 */

if (!PhoneGap.hasResource("storage")) {
PhoneGap.addResource("storage");

/**
 * SQL result set object
 * PRIVATE METHOD
 * @constructor
 */
var DroidDB_Rows = function() {
    this.resultSet = [];    // results array
    this.length = 0;        // number of rows
};

/**
 * Get item from SQL result set
 *
 * @param row           The row number to return
 * @return              The row object
 */
DroidDB_Rows.prototype.item = function(row) {
    return this.resultSet[row];
};

/**
 * SQL result set that is returned to user.
 * PRIVATE METHOD
 * @constructor
 */
var DroidDB_Result = function() {
    this.rows = new DroidDB_Rows();
};

/**
 * Storage object that is called by native code when performing queries.
 * PRIVATE METHOD
 * @constructor
 */
var DroidDB = function() {
    this.queryQueue = {};
};

/**
 * Callback from native code when query is complete.
 * PRIVATE METHOD
 *
 * @param id                Query id
 */
DroidDB.prototype.completeQuery = function(id, data) {
    var query = this.queryQueue[id];
    if (query) {
        try {
            delete this.queryQueue[id];

            // Get transaction
            var tx = query.tx;

            // If transaction hasn't failed
            // Note: We ignore all query results if previous query
            //       in the same transaction failed.
            if (tx && tx.queryList[id]) {

                // Save query results
                var r = new DroidDB_Result();
                r.rows.resultSet = data;
                r.rows.length = data.length;
                try {
                    if (typeof query.successCallback === 'function') {
                        query.successCallback(query.tx, r);
                    }
                } catch (ex) {
                    console.log("executeSql error calling user success callback: "+ex);
                }

                tx.queryComplete(id);
            }
        } catch (e) {
            console.log("executeSql error: "+e);
        }
    }
};

/**
 * Callback from native code when query fails
 * PRIVATE METHOD
 *
 * @param reason            Error message
 * @param id                Query id
 */
DroidDB.prototype.fail = function(reason, id) {
    var query = this.queryQueue[id];
    if (query) {
        try {
            delete this.queryQueue[id];

            // Get transaction
            var tx = query.tx;

            // If transaction hasn't failed
            // Note: We ignore all query results if previous query
            //       in the same transaction failed.
            if (tx && tx.queryList[id]) {
                tx.queryList = {};

                try {
                    if (typeof query.errorCallback === 'function') {
                        query.errorCallback(query.tx, reason);
                    }
                } catch (ex) {
                    console.log("executeSql error calling user error callback: "+ex);
                }

                tx.queryFailed(id, reason);
            }

        } catch (e) {
            console.log("executeSql error: "+e);
        }
    }
};

/**
 * SQL query object
 * PRIVATE METHOD
 *
 * @constructor
 * @param tx                The transaction object that this query belongs to
 */
var DroidDB_Query = function(tx) {

    // Set the id of the query
    this.id = PhoneGap.createUUID();

    // Add this query to the queue
    droiddb.queryQueue[this.id] = this;

    // Init result
    this.resultSet = [];

    // Set transaction that this query belongs to
    this.tx = tx;

    // Add this query to transaction list
    this.tx.queryList[this.id] = this;

    // Callbacks
    this.successCallback = null;
    this.errorCallback = null;

};

/**
 * Transaction object
 * PRIVATE METHOD
 * @constructor
 */
var DroidDB_Tx = function() {

    // Set the id of the transaction
    this.id = PhoneGap.createUUID();

    // Callbacks
    this.successCallback = null;
    this.errorCallback = null;

    // Query list
    this.queryList = {};
};

/**
 * Mark query in transaction as complete.
 * If all queries are complete, call the user's transaction success callback.
 *
 * @param id                Query id
 */
DroidDB_Tx.prototype.queryComplete = function(id) {
    delete this.queryList[id];

    // If no more outstanding queries, then fire transaction success
    if (this.successCallback) {
        var count = 0;
        var i;
        for (i in this.queryList) {
            if (this.queryList.hasOwnProperty(i)) {
                count++;
            }
        }
        if (count === 0) {
            try {
                this.successCallback();
            } catch(e) {
                console.log("Transaction error calling user success callback: " + e);
            }
        }
    }
};

/**
 * Mark query in transaction as failed.
 *
 * @param id                Query id
 * @param reason            Error message
 */
DroidDB_Tx.prototype.queryFailed = function(id, reason) {

    // The sql queries in this transaction have already been run, since
    // we really don't have a real transaction implemented in native code.
    // However, the user callbacks for the remaining sql queries in transaction
    // will not be called.
    this.queryList = {};

    if (this.errorCallback) {
        try {
            this.errorCallback(reason);
        } catch(e) {
            console.log("Transaction error calling user error callback: " + e);
        }
    }
};

/**
 * Execute SQL statement
 *
 * @param sql                   SQL statement to execute
 * @param params                Statement parameters
 * @param successCallback       Success callback
 * @param errorCallback         Error callback
 */
DroidDB_Tx.prototype.executeSql = function(sql, params, successCallback, errorCallback) {

    // Init params array
    if (typeof params === 'undefined') {
        params = [];
    }

    // Create query and add to queue
    var query = new DroidDB_Query(this);
    droiddb.queryQueue[query.id] = query;

    // Save callbacks
    query.successCallback = successCallback;
    query.errorCallback = errorCallback;

    // Call native code
    PhoneGap.exec(null, null, "Storage", "executeSql", [sql, params, query.id]);
};

var DatabaseShell = function() {
};

/**
 * Start a transaction.
 * Does not support rollback in event of failure.
 *
 * @param process {Function}            The transaction function
 * @param successCallback {Function}
 * @param errorCallback {Function}
 */
DatabaseShell.prototype.transaction = function(process, errorCallback, successCallback) {
    var tx = new DroidDB_Tx();
    tx.successCallback = successCallback;
    tx.errorCallback = errorCallback;
    try {
        process(tx);
    } catch (e) {
        console.log("Transaction error: "+e);
        if (tx.errorCallback) {
            try {
                tx.errorCallback(e);
            } catch (ex) {
                console.log("Transaction error calling user error callback: "+e);
            }
        }
    }
};

/**
 * Open database
 *
 * @param name              Database name
 * @param version           Database version
 * @param display_name      Database display name
 * @param size              Database size in bytes
 * @return                  Database object
 */
var DroidDB_openDatabase = function(name, version, display_name, size) {
    PhoneGap.exec(null, null, "Storage", "openDatabase", [name, version, display_name, size]);
    var db = new DatabaseShell();
    return db;
};

/**
 * For browsers with no localStorage we emulate it with SQLite. Follows the w3c api.
 * TODO: Do similar for sessionStorage.
 */

/**
 * @constructor
 */
var CupcakeLocalStorage = function() {
    try {

      this.db = openDatabase('localStorage', '1.0', 'localStorage', 2621440);
      var storage = {};
      this.length = 0;
      function setLength (length) {
        this.length = length;
        localStorage.length = length;
      }
      this.db.transaction(
        function (transaction) {
            var i;
          transaction.executeSql('CREATE TABLE IF NOT EXISTS storage (id NVARCHAR(40) PRIMARY KEY, body NVARCHAR(255))');
          transaction.executeSql('SELECT * FROM storage', [], function(tx, result) {
            for(var i = 0; i < result.rows.length; i++) {
              storage[result.rows.item(i)['id']] =  result.rows.item(i)['body'];
            }
            setLength(result.rows.length);
            PhoneGap.initializationComplete("cupcakeStorage");
          });

        },
        function (err) {
          alert(err.message);
        }
      );
      this.setItem = function(key, val) {
        if (typeof(storage[key])=='undefined') {
          this.length++;
        }
        storage[key] = val;
        this.db.transaction(
          function (transaction) {
            transaction.executeSql('CREATE TABLE IF NOT EXISTS storage (id NVARCHAR(40) PRIMARY KEY, body NVARCHAR(255))');
            transaction.executeSql('REPLACE INTO storage (id, body) values(?,?)', [key,val]);
          }
        );
      };
      this.getItem = function(key) {
        return storage[key];
      };
      this.removeItem = function(key) {
        delete storage[key];
        this.length--;
        this.db.transaction(
          function (transaction) {
            transaction.executeSql('CREATE TABLE IF NOT EXISTS storage (id NVARCHAR(40) PRIMARY KEY, body NVARCHAR(255))');
            transaction.executeSql('DELETE FROM storage where id=?', [key]);
          }
        );
      };
      this.clear = function() {
        storage = {};
        this.length = 0;
        this.db.transaction(
          function (transaction) {
            transaction.executeSql('CREATE TABLE IF NOT EXISTS storage (id NVARCHAR(40) PRIMARY KEY, body NVARCHAR(255))');
            transaction.executeSql('DELETE FROM storage', []);
          }
        );
      };
      this.key = function(index) {
        var i = 0;
        for (var j in storage) {
          if (i==index) {
            return j;
          } else {
            i++;
          }
        }
        return null;
      };

    } catch(e) {
      alert("Database error "+e+".");
        return;
    }
};

PhoneGap.addConstructor(function() {
    var setupDroidDB = function() {
        navigator.openDatabase = window.openDatabase = DroidDB_openDatabase;
        window.droiddb = new DroidDB();
    }
    if (typeof window.openDatabase === "undefined") {
        setupDroidDB();
    } else {
        window.openDatabase_orig = window.openDatabase;
        window.openDatabase = function(name, version, desc, size){
            // Some versions of Android will throw a SECURITY_ERR so we need 
            // to catch the exception and seutp our own DB handling.
            var db = null;
            try {
                db = window.openDatabase_orig(name, version, desc, size);
            } 
            catch (ex) {
                db = null;
            }

            if (db == null) {
                setupDroidDB();
                return DroidDB_openDatabase(name, version, desc, size);
            }
            else {
                return db;
            }
        };
    }
    
    if ((typeof window.localStorage == "undefined") || (window.localStorage == null)) {
        navigator.localStorage = window.localStorage = new CupcakeLocalStorage();
        PhoneGap.waitForInitialization("cupcakeStorage");
    }
});
}
Hide details
Change log
r126 by paul.beusterien on Dec 19, 2011   Diff
Update PhoneGap to 1.3.0
Go to: 	
Project members, sign in to write a code review
Older revisions
All revisions of this file
File info
Size: 146359 bytes, 4636 lines
View raw file
File properties
svn:mime-type
text/plain
