/// <reference lib="webworker" />
import * as Comlink from 'comlink';
import { analysisApi } from './analysis';

/** 分析の計算を画面の外（Worker）で行う */
Comlink.expose(analysisApi);
