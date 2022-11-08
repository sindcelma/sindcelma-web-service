import { Request, Response } from "express";
import User from "./User";
import Admin from "./Admin";
import Visitante from './Visitante';
import Socio from "./Socio";
import { generateToken, verifyToken, Token, comparePass } from "../lib/jwt";
import mysqli from "../lib/mysqli";


const setDataAdmin = (data:any, admin:Admin):Admin => {
    admin.setSlug(data.slug)
    admin.setNome(data.nome)
    return admin
}

const setDataSocio = (data:any, socio:Socio):Socio => {
    socio.setFullName(data.nome, data.sobrenome)
    socio.setSlug(data.slug)
    socio.setStatus(data.status)
    socio.setOthersDatas(data);
    return socio
}


const getAdmin = (email:String, senha:string, fn:(user:User, error:Boolean, msg:String) => void, remem:Boolean) =>{

    const conn = mysqli()

    try {
        let query = 
                `SELECT 
                    user.id,
                    user.email,
                    user.version,
                    admin.slug
                FROM user 
                JOIN admin ON admin.user_id = user.id
                    WHERE user.email = ?
                    AND   user.senha = ?
                `;

        conn.query(query, [email, senha], (err, result) => {
            
            if(err){
                return fn(new Visitante, true, "Internal Error")
            }

            if(result.length > 0){
                
                const res = result[0]

                const user = {
                    id:res.id,
                    email:res.email,
                    version:res.version
                } 

                const admin = new Admin(user)
                conn.end()
                
                return fn(setDataAdmin(res, admin), false, "")
                
            } 

            conn.end()
            fn(new Visitante, true, "Você digitou e-mail e/ou senha incorretos ou este usuário não existe")
            
        })
    } catch (error) {
        fn(new Visitante, true, "Internal Error")
        conn.end()
    }

}

const getSocio = (email:String, senha:string, fn:(user:User, error:Boolean, msg:String) => void, remember:Boolean) => {

    const conn = mysqli()

    try {
        let query = 
        `SELECT 
            socios.nome,
            socios.sobrenome,
            socios.slug,
            socios.status,
            socios.salt,
            socios.cpf,
            user.id,
            user.email,
            user.senha,
            user.version,
            socios_dados_pessoais.rg,
            socios_dados_pessoais.sexo,
            socios_dados_pessoais.estado_civil,
            socios_dados_pessoais.data_nascimento,
            socios_dados_pessoais.telefone,
            socios_dados_profissionais.cargo,
            socios_dados_profissionais.data_admissao,
            socios_dados_profissionais.num_matricula,
            empresas.nome as nome_empresa
        FROM  user
        JOIN  socios ON socios.id = user.socio_id
        JOIN  socios_dados_pessoais ON socios_dados_pessoais.socio_id = socios.id
        JOIN  socios_dados_profissionais ON socios_dados_profissionais.socio_id = socios.id
        JOIN  empresas ON socios_dados_profissionais.empresa_id = empresas.id
       WHERE  user.email = ?`;

        conn.query(query, [email], async (err, result) => {
            
            if(err){
                return fn(new Visitante, true, "Internal Error")
            }

            if(result.length > 0){
                
                const res = result[0]
                const status = await comparePass(senha, res.senha);
                if(!status){
                    return fn(new Visitante, true, "Não autorizado")
                }

                const user = {
                    id:res.id,
                    email:res.email,
                    version:res.version
                } 

                if(res.status > 2){
                    return fn(new Visitante, true, "Sócio Bloqueado")                    
                }

                const socio = new Socio(user)
                conn.end()
                
                return fn(setDataSocio(res, socio), false, "")
                
            } 

            conn.end()
            fn(new Visitante, true, "Você digitou e-mail e/ou senha incorretos, este usuário não existe ou está bloqueado.")
            
        })
    } catch (error) {
        fn(new Visitante, true, "Internal Error")
        conn.end()
    }

}

const getUser = (type:String, email:String, senha:string, fn:(user:User, error:Boolean, msg:String) => void, remember:Boolean = false) => {
    
    switch (type) {
        case "Admin": getAdmin(email, senha, fn, remember); break;
        case "Socio": getSocio(email, senha, fn, remember); break;
        default: fn(new Visitante, true, "Este tipo de usuário não existe")
    }
    
}

const genAdmin = (dataToken:any):User => {
    const adm = new Admin(dataToken)
    return setDataAdmin(dataToken, adm)
}


const getSocioByRememberme = (remembermetk:String, fn:(user:User, error:Boolean, msg:String) => void) => {

    let query:string = `
        SELECT 
            socios.nome,
            socios.sobrenome,
            socios.slug,
            socios.status,
            socios.salt,
            socios.cpf,
            user.id,
            user.email,
            user.senha,
            user.version,
            socios_dados_pessoais.rg,
            socios_dados_pessoais.sexo,
            socios_dados_pessoais.estado_civil,
            socios_dados_pessoais.data_nascimento,
            socios_dados_pessoais.telefone,
            socios_dados_profissionais.cargo,
            socios_dados_profissionais.data_admissao,
            socios_dados_profissionais.num_matricula,
            empresas.nome as nome_empresa
            
        FROM  user
            JOIN socios ON user.socio_id = socios.id 
            JOIN socios_dados_pessoais ON socios_dados_pessoais.socio_id = socios.id
            JOIN socios_dados_profissionais ON socios_dados_profissionais.socio_id = socios.id
            JOIN user_devices ON user_devices.user_id = user.id
            JOIN empresas ON socios_dados_profissionais.empresa_id = empresas.id
                    WHERE user_devices.rememberme = ?
                    `

    const conn = mysqli() 
    try {
        conn.query(query, [remembermetk], (err, result) => {

            console.log(err);
            
        
            if(err){
                return fn(new Visitante, true, "Internal Error 1")
            }
        
            if(result.length > 0){
                    
                const res = result[0]

                const user = {
                    id:res.id,
                    email:res.email,
                    version:res.version
                } 
    
                if(res.status > 2){
                    return fn(new Visitante, true, "Sócio Bloqueado")                    
                }

                const socio = new Socio(user)
                conn.end()
                
                return fn(setDataSocio(res, socio), false, "")
                
            } 
    
            conn.end()
            fn(new Visitante, true, "Este Token expirou ou não é válido")
        })
    } catch (error) {
        fn(new Visitante, true, "Internal Error 2")
        conn.end()
    }
}

const getAdminByRememberme = (remembermetk:String, fn:(user:User, error:Boolean, msg:String) => void) => {
    
    let query:string = `
        SELECT 
            user.id,
            user.email,
            user.version,
            admin.slug
        FROM user 
            JOIN admin ON admin.user_id = user.id
            JOIN user_devices ON user_devices.user_id = user.id
                    WHERE user_devices.rememberme = ?
                    `

    const conn = mysqli() 
    try {
        conn.query(query, [remembermetk], (err, result) => {
        
            if(err){
                return fn(new Visitante, true, "Internal Error")
            }
    
        
            if(result.length > 0){
                    
                const res = result[0]
                const user = {
                    id:res.id,
                    email:res.email,
                    version:res.version
                } 
    
                const admin = new Admin(user)
                conn.end()
                
                return fn(setDataAdmin(res, admin), false, "")
                
            } 
    
            conn.end()
            fn(new Visitante, true, "Este Token expirou ou não é válido")
        })
    } catch (error) {
        fn(new Visitante, true, "Internal Error")
        conn.end()
    }
    
}

const getUserByRememberme = (type:String, remembermetk:String, fn:(user:User, error:Boolean, msg:String) => void) => {
    switch (type) {
        case "Admin": getAdminByRememberme(remembermetk, fn); break;
        case "Socio": getSocioByRememberme(remembermetk, fn); break;
        default: fn(new Visitante, true, "Este tipo de usuário não existe")
    }
}

const getUserByToken = (sessionToken:Token):User => {

    if(!sessionToken.status) return new Visitante()

    switch (sessionToken.type) {
        case "Socio": return new Socio(sessionToken.data) 
        case "Admin": return genAdmin(sessionToken.data) 
        default: return new Visitante()
    }

}

const setUserBySessionToken = (sessionToken:string):User => {
    
    const sess:Token = verifyToken(sessionToken)
    const user:User = getUserByToken(sess)
    
    user.setSession( sess.status && sess.expired ? generateToken(sess.type, sess.data) : sessionToken)

    return user

}

const middleware = async function(req:Request, res:Response, next?:any){
    
    req.user = req.body.session != null ? setUserBySessionToken(String(req.body.session)) : new Visitante()
    req.user.setAgent(req.get('User-Agent'))
    
    if(!(req.user instanceof Visitante)){
        
        const conn = mysqli();
        conn.query("SELECT id FROM user WHERE id = ? AND version = ?", [req.user.getId(), req.user.getVersion()], (err, result) => {
            if(result.length == 0){
                req.user = new Visitante()
            } else {
                res.user = req.user
            }
            next()
        });

    } else {
        next()
    }

}

export {
    middleware,
    getUser,
    getUserByRememberme
}
