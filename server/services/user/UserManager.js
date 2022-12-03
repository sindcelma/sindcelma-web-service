"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jwt_1 = require("../../lib/jwt");
const mysqli_1 = __importDefault(require("../../lib/mysqli"));
const response_1 = __importDefault(require("../../lib/response"));
const Socio_1 = __importDefault(require("../../model/Socio"));
const fs_1 = require("fs");
const path_1 = require("path");
class UserManager {
    static check_login(req, res) {
        const doc = req.body.doc;
        if (!doc)
            return (0, response_1.default)(res).error(400, "Bad Request");
        const cpf = Socio_1.default.transformCpf(req.body.doc);
        const cpfq = cpf ? cpf : '';
        const conn = (0, mysqli_1.default)();
        conn.query(`
            SELECT 
            socios.cpf,
            socios.np,
            user.email
            FROM socios
            LEFT JOIN user ON user.socio_id = socios.id 
            WHERE user.email = ? OR socios.cpf = ? OR socios.np = ?
        `, [doc, cpfq, doc], (err, result) => {
            if (err)
                return (0, response_1.default)(res).error(500, 'Internal Error');
            if (result.length > 0) {
                return (0, response_1.default)(res).success({
                    email: result[0].email ? result[0].email : false,
                    np: result[0].np ? result[0].np : false,
                    cpf: result[0].cpf ? result[0].cpf : false
                });
            }
            return (0, response_1.default)(res).error(404, "Usuário não encontrado");
        });
    }
    static close_all_sessions(req, res) {
        // apenas administradores ou usuários com a mesma sessão
        const user_id = req.body.user_id;
        if (!user_id)
            return (0, response_1.default)(res).error(401, 'Unauthorized');
        const conn = (0, mysqli_1.default)();
        conn.query("UPDATE user SET version = version + 1 WHERE id = ?", [user_id], err => {
            if (err)
                return (0, response_1.default)(res).error(500, 'internal error');
            conn.query("DELETE FROM user_devices WHERE user_id = ?", [user_id], err => {
                if (err)
                    return (0, response_1.default)(res).error(500, 'internal error');
                (0, response_1.default)(res).success();
            });
        });
    }
    static check_email(req, res) {
        const email = req.body.email;
        if (!email)
            return (0, response_1.default)(res).error(401, 'Unauthorized');
        const conn = (0, mysqli_1.default)();
        conn.query(`SELECT 
                id,
                ativo
            FROM user 
            WHERE
                email = ?`, [email], (err, result) => {
            if (err)
                return (0, response_1.default)(res).error(500, 'Interal Error 2');
            if (result.length > 0) {
                let user = result[0];
                if (user.ativo == 0) {
                    conn.query("DELETE FROM user WHERE email = ?", [email]);
                    return (0, response_1.default)(res).success(email);
                }
                return (0, response_1.default)(res).error(401, 'Este email já está em uso');
            }
            return (0, response_1.default)(res).success(email);
        });
    }
    static _update_user(email, senha, fn) {
    }
    static _save_user(email, senha, fn) {
        const conn = (0, mysqli_1.default)();
        conn.query("INSERT INTO user (email, senha) VALUES (?,?)", [], (err, result) => fn(err, result));
    }
    static create_user(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!req.body.senha || !req.body.email)
                return (0, response_1.default)(res).error(400, 'Bad Request');
            const email = req.body.email;
            const doc = Socio_1.default.transformCpf(req.body.doc);
            const senha = yield (0, jwt_1.hashPass)(req.body.senha);
            const conn = (0, mysqli_1.default)();
            conn.query(`
            SELECT 
                socios.id,
                socios.cpf,
                user.email 
            FROM socios
            LEFT JOIN user ON user.socio_id = socios.id 
            WHERE
            socios.cpf = ?
        `, [doc], (err, result) => {
                if (err)
                    return (0, response_1.default)(res).error(500, 'Internal Error');
                if (result.length == 0)
                    return (0, response_1.default)(res).error(404, "Não encontramos um sócio com este documento");
                const socio = result[0];
                const socio_id = socio['id'];
                if (!socio.email) {
                    try {
                        const elements = [
                            'arara-azul.jpg', 'ariranha.jpg',
                            'mico-leao-dourado.jpg', 'onca-pintada.jpg',
                            'peixe-boi.jpg', 'tamandua.jpg'
                        ];
                        const image = (0, path_1.join)(__dirname, `../../public/images/padroes/${elements[Math.floor(Math.random() * elements.length)]}`);
                        const copy = (0, path_1.join)(__dirname, `../../public/images/fav/${email}.jpg`);
                        (0, fs_1.copyFileSync)(image, copy);
                        conn.query("INSERT INTO user(socio_id, email, senha) VALUES (?,?,?)", [socio_id, email, senha], err => {
                            if (err)
                                return (0, response_1.default)(res).error(500, 'Erro ao tentar gerar usuário');
                            (0, response_1.default)(res).success();
                        });
                    }
                    catch (error) {
                        (0, response_1.default)(res).error(500, 'Falha ao tentar criar imagem do usuário');
                    }
                }
                else {
                    (0, response_1.default)(res).error(500, 'Já existe um usuário cadastrado para o sócio');
                }
            });
        });
    }
}
exports.default = UserManager;
//# sourceMappingURL=UserManager.js.map