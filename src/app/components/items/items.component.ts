import {
  Component,
  OnInit,
  ViewChild
} from '@angular/core';
import { InventorydataService } from '../../services/inventorydata.service';
import { StaticdataholdingService } from '../../services/staticdataholding.service';
import { ElectronService } from 'ngx-electron';

import { Item } from '../../models/Item';

@Component({
  selector: 'app-items',
  templateUrl: './items.component.html',
  styleUrls: ['./items.component.css']
})
export class ItemsComponent implements OnInit {

  inventory: Item[] = [];
  categories: any[] = [];
  taxes: any[] = [];
  offers: any[] = [];
  isActive: boolean = false;
  isEdit: boolean = false;
  user : any = {name : '' , canedit : false}

  @ViewChild('itemForm') form: any;

  currentItem: Item = {
    id: null,
    prodid: null,
    prodname: null,
    proddisc: null,
    isremoved: false,
    stock: null,
    unitprice: null,
    category: null,
    tax: null,
    hasoff: 0,
    offtype: 'percent',
    offvalue: 0,
    updated_by: null
  };

  constructor(private _inventorydataService: InventorydataService, private _staticdataService: StaticdataholdingService, private _electronService: ElectronService) {}

  ngOnInit() {
    this._inventorydataService.getOffers().subscribe(response => {
      console.log(response)
      if(response.status == 'success'){
        this.offers = response.data;
        this._inventorydataService.getInventory().subscribe(items => {
          this.inventory = items;
        })
      }
    })
    this._inventorydataService.getCategory().subscribe(categories => {
      if(categories.status == 'success'){
        this.categories = categories.data;
      }
    })
    
    this._inventorydataService.getstoredId().subscribe(itemid => {
      if(!this.isEdit){
        this.currentItem.prodid = 'P' + (itemid.prodid + 1).toString();
      }
    });
    this._inventorydataService.getTaxes().subscribe(taxes => {
      if(taxes.status == 'success'){
        this.taxes = taxes.data;
      }
    })
    this._electronService.remote.session.defaultSession.cookies.get({}, (error, cookies) => {
      cookies.forEach(item => {
        if(item.name == 'user'){
          this.user.name = item.value;
        }else if (item.name == 'canedit' && item.value == 'true'){
          this.user.canedit = true;
        }
      })
    })
  }


  onChangeOffer(offerId: number) {

    this.offers.some((cur, index) => {
      if(cur.offerid == offerId){
        this.currentItem.hasoff = offerId;
        this.currentItem.offtype = this.offers[index].type;
        this.currentItem.offvalue = this.offers[index].value;
        return true;
      }
      return false;
    })
  }

  onSubmit({
    value,
    valid
  }: {
    value: any,
    valid: boolean
  }) {
    if (valid && !this.isActive) {
      this.isActive = true;
      this.isEdit ? this.onEditItem(this.currentItem) : this.onAddItem(value);
    }
  }

  onUpdateItem(item: Item) {
    this.isEdit = true;
    this.currentItem = Object.assign({}, item);
  }

  onRemoveItem(item: Item) {
    this._inventorydataService.removeItem(item).subscribe(item => {
      this.inventory.forEach((cur, index) => {
        if (item.prodid === cur.prodid) {
          this.inventory.splice(index, 1);
        }
      })
      this.form.reset();
      this.isActive = false;
    })
  }

  onEditItem(item: Item) {
    this.categories.forEach((cur) => {
      if(cur.id === item.category){
        item['categoryname'] = cur.name;
      }
    })

    this._inventorydataService.editItem(item).subscribe(item => {
      this.inventory.forEach((cur, index) => {
        if (item.prodid === cur.prodid) {
          this.inventory.splice(index, 1);
          this.inventory.unshift(item);
        }
      });
      this.setEmptyItem();
      this.isActive = false;
    })
  }

  onAddItem(item: Item) {
    item.prodid = this.currentItem.prodid;
    item.updated_by = this.user.name;
    item.updated_at = new Date();
    this._inventorydataService.savePost(item).subscribe(item => {
      if (item.status === 'ok') {
        this.inventory.unshift(item);
        this.setEmptyItem();
        this.isActive = false;
      } else {
        this.isActive = false;
        //do error popup here
      }
    }, error => {
      console.log(error);
    })
  }

  setEmptyItem() {
    this.form.reset();
    this._inventorydataService.getstoredId().subscribe(itemid => {
      this.isEdit = false;
      this.currentItem = {
        id: null,
        prodid: 'P' + (itemid.prodid + 1).toString(),
        prodname: null,
        proddisc: null,
        isremoved: false,
        stock: null,
        unitprice: null,
        category: 0,
        tax: 0,
        hasoff: 0,
        offtype: 'percent',
        offvalue: 0,
        updated_by: this.user.name
      };
    })

  }

}
