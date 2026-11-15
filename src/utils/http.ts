import { Response } from "express";

export function sendCreated<T>(res: Response, data: T) {
  return res.status(201).json(data);
}

export function sendOk<T>(res: Response, data: T) {
  return res.status(200).json(data);
}
