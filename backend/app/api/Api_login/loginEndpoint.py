from flask import Blueprint, request, jsonify, current_app
from app.services.AccountService import AccountService
from itertools import pairwise
from app.repositories.AccountRepo import AccountRepo

login_bp = Blueprint('login', __name__)

@login_bp.route('/login',methods=['POST'])
def login():
    print('reached backend logic of the api')
    accountRepo= AccountRepo('localhost','Maps_DB','postgres','Qwertyuiop12')
    accountService=AccountService(accountRepo)

    data=request.json
    email=data.get('email')
    password=data.get('password')
    try:    
        accountService.login(email,password)
        user=accountService.findAccount(email)
        return jsonify(user)
    except Exception as e:
        return jsonify(str(e)),404
    
@login_bp.route('/googleLogin',methods=['POST'])
def googleLogin():
    accountRepo= AccountRepo('localhost','Maps_DB','postgres','Qwertyuiop12!')
    accountService=AccountService(accountRepo)
    data=request.json
    email=data.get('email')
    if accountService.findAccount(email)!=None:
        user=accountService.findAccount(email)
        return jsonify(user)
    else:
        userName=data.get('userName') 
        accountService.addAccount(userName,email,'','google')
        user=accountService.findAccount(email)
        return jsonify(user)